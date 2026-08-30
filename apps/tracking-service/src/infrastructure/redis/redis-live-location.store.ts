import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DriverLocationView, NearbyDriverView } from '../../application/models/location.view';
import { LiveLocationStore, NearbySearchInput } from '../../application/ports/live-location.store';

@Injectable()
export class RedisLiveLocationStore implements LiveLocationStore, OnModuleDestroy {
  private readonly redis: Redis;
  private readonly geoKey: string;
  private readonly metaPrefix: string;
  private readonly ttlSeconds: number;

  constructor(config: ConfigService) {
    this.redis = new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: Number(config.get<string>('REDIS_PORT', '6379')),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
      tls: config.get<string>('REDIS_TLS', 'false') === 'true' ? {} : undefined,
      maxRetriesPerRequest: null,
    });
    this.geoKey = config.get<string>('TRACKING_GEO_KEY', 'routefast:tracking:drivers');
    this.metaPrefix = config.get<string>('TRACKING_META_PREFIX', 'routefast:tracking:driver-meta');
    this.ttlSeconds = Number(config.get<string>('TRACKING_LOCATION_TTL_SECONDS', '120'));
  }

  async upsert(location: DriverLocationView): Promise<boolean> {
    const key = this.metaKey(location.driverId);
    const recordedAtEpochMs = new Date(location.recordedAt).getTime();
    // Atomic ordering guard: a late GPS packet may be persisted historically,
    // but it cannot rewind the current Redis GEO position.
    const script = `
      local current = redis.call('HGET', KEYS[2], 'recordedAtEpochMs')
      if current and tonumber(current) > tonumber(ARGV[4]) then
        return 0
      end
      redis.call('GEOADD', KEYS[1], ARGV[2], ARGV[1], ARGV[3])
      redis.call('HSET', KEYS[2],
        'driverId', ARGV[3],
        'latitude', ARGV[1],
        'longitude', ARGV[2],
        'speedKph', ARGV[5],
        'headingDegrees', ARGV[6],
        'recordedAt', ARGV[7],
        'receivedAt', ARGV[8],
        'recordedAtEpochMs', ARGV[4])
      redis.call('EXPIRE', KEYS[2], ARGV[9])
      return 1
    `;
    const result = await this.redis.eval(
      script,
      2,
      this.geoKey,
      key,
      String(location.latitude),
      String(location.longitude),
      location.driverId,
      String(recordedAtEpochMs),
      location.speedKph === null ? '' : String(location.speedKph),
      location.headingDegrees === null ? '' : String(location.headingDegrees),
      location.recordedAt,
      location.receivedAt,
      String(this.ttlSeconds),
    );
    return Number(result) === 1;
  }

  async get(driverId: string): Promise<DriverLocationView | null> {
    const raw = await this.redis.hgetall(this.metaKey(driverId));
    if (!raw.driverId) return null;
    return this.toView(raw);
  }

  async findNearby(input: NearbySearchInput): Promise<NearbyDriverView[]> {
    const raw = await this.redis.call(
      'GEOSEARCH', this.geoKey,
      'FROMLONLAT', String(input.longitude), String(input.latitude),
      'BYRADIUS', String(input.radiusKm), 'km',
      'ASC', 'COUNT', String(Math.max(input.limit * 3, input.limit)),
      'WITHDIST',
    ) as unknown;

    if (!Array.isArray(raw)) return [];
    const allowed = input.candidateDriverIds ? new Set(input.candidateDriverIds) : null;
    const maxAge = input.maxAgeSeconds ?? this.ttlSeconds;
    const results: NearbyDriverView[] = [];

    for (const item of raw) {
      if (!Array.isArray(item) || item.length < 2) continue;
      const driverId = String(item[0]);
      if (allowed && !allowed.has(driverId)) continue;
      const location = await this.get(driverId);
      if (!location) continue;
      const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(location.receivedAt).getTime()) / 1000));
      if (ageSeconds > maxAge) continue;
      results.push({
        ...location,
        distanceKm: Number(Number(item[1]).toFixed(3)),
        ageSeconds,
      });
      if (results.length >= input.limit) break;
    }
    return results;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private metaKey(driverId: string): string { return `${this.metaPrefix}:${driverId}`; }

  private toView(raw: Record<string, string>): DriverLocationView {
    return {
      driverId: raw.driverId!,
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
      speedKph: raw.speedKph === '' ? null : Number(raw.speedKph),
      headingDegrees: raw.headingDegrees === '' ? null : Number(raw.headingDegrees),
      recordedAt: raw.recordedAt!,
      receivedAt: raw.receivedAt!,
    };
  }
}

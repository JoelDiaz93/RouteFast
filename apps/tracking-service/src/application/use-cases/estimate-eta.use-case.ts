import { Coordinates } from '../../domain/value-objects/coordinates.vo';
import { EtaView } from '../models/location.view';
import { LiveLocationStore } from '../ports/live-location.store';
import { haversineDistanceKm } from '../../domain/services/haversine-distance';

export class EstimateEtaUseCase {
  constructor(
    private readonly liveStore: LiveLocationStore,
    private readonly averageSpeedKph: number,
    private readonly roadFactor: number,
  ) {}

  async execute(input: { driverId: string; latitude: number; longitude: number }): Promise<EtaView | null> {
    const target = Coordinates.create(input.latitude, input.longitude);
    const current = await this.liveStore.get(input.driverId);
    if (!current) return null;
    const directDistance = haversineDistanceKm(
      current.latitude,
      current.longitude,
      target.latitude,
      target.longitude,
    );
    const distanceKm = directDistance * this.roadFactor;
    const estimatedMinutes = Math.max(1, Math.ceil((distanceKm / this.averageSpeedKph) * 60));
    const locationAgeSeconds = Math.max(0, Math.floor((Date.now() - new Date(current.receivedAt).getTime()) / 1000));
    return {
      driverId: input.driverId,
      distanceKm: Number(distanceKm.toFixed(3)),
      estimatedMinutes,
      averageSpeedKph: this.averageSpeedKph,
      roadFactor: this.roadFactor,
      locationAgeSeconds,
    };
  }
}

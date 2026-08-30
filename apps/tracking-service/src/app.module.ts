import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  LIVE_LOCATION_STORE,
  LiveLocationStore,
} from './application/ports/live-location.store';
import {
  LOCATION_HISTORY_REPOSITORY,
  LocationHistoryRepository,
} from './application/ports/location-history.repository';
import {
  LOCATION_PERSISTENCE_QUEUE,
  LocationPersistenceQueue,
} from './application/ports/location-persistence.queue';
import { EstimateEtaUseCase } from './application/use-cases/estimate-eta.use-case';
import { FindNearbyDriversUseCase } from './application/use-cases/find-nearby-drivers.use-case';
import { GetLatestLocationUseCase } from './application/use-cases/get-latest-location.use-case';
import { GetLocationHistoryUseCase } from './application/use-cases/get-location-history.use-case';
import { UpdateDriverLocationUseCase } from './application/use-cases/update-driver-location.use-case';
import { HealthModule } from './health/health.module';
import { BullLocationPersistenceQueue } from './infrastructure/jobs/location-persistence.queue';
import { LocationPersistenceWorker } from './infrastructure/jobs/location-persistence.worker';
import { PostgisLocationHistoryRepository } from './infrastructure/postgis/postgis-location-history.repository';
import { PostgisSchemaBootstrap } from './infrastructure/postgis/postgis-schema.bootstrap';
import { RedisLiveLocationStore } from './infrastructure/redis/redis-live-location.store';
import { TrackingController } from './interfaces/http/tracking.controller';
import { TrackingGateway } from './interfaces/ws/tracking.gateway';

import { MetricsModule } from './observability/metrics.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MetricsModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('TRACKING_DB_HOST', 'localhost'),
        port: Number(config.get<string>('TRACKING_DB_PORT', '55435')),
        username: config.get<string>('TRACKING_DB_USER', 'routefast'),
        password: config.get<string>('TRACKING_DB_PASSWORD', 'routefast'),
        database: config.get<string>('TRACKING_DB_NAME', 'routefast_tracking'),
        ssl: config.get<string>('TRACKING_DB_SSL', 'false') === 'true',
        entities: [],
        synchronize: false,
      }),
    }),
    HealthModule,
  ],
  controllers: [TrackingController],
  providers: [
    RedisLiveLocationStore,
    PostgisLocationHistoryRepository,
    PostgisSchemaBootstrap,
    BullLocationPersistenceQueue,
    LocationPersistenceWorker,
    TrackingGateway,
    { provide: LIVE_LOCATION_STORE, useExisting: RedisLiveLocationStore },
    { provide: LOCATION_HISTORY_REPOSITORY, useExisting: PostgisLocationHistoryRepository },
    { provide: LOCATION_PERSISTENCE_QUEUE, useExisting: BullLocationPersistenceQueue },
    {
      provide: UpdateDriverLocationUseCase,
      inject: [LIVE_LOCATION_STORE, LOCATION_PERSISTENCE_QUEUE],
      useFactory: (live: LiveLocationStore, queue: LocationPersistenceQueue) =>
        new UpdateDriverLocationUseCase(live, queue),
    },
    {
      provide: GetLatestLocationUseCase,
      inject: [LIVE_LOCATION_STORE, LOCATION_HISTORY_REPOSITORY],
      useFactory: (live: LiveLocationStore, history: LocationHistoryRepository) =>
        new GetLatestLocationUseCase(live, history),
    },
    {
      provide: GetLocationHistoryUseCase,
      inject: [LOCATION_HISTORY_REPOSITORY],
      useFactory: (history: LocationHistoryRepository) => new GetLocationHistoryUseCase(history),
    },
    {
      provide: FindNearbyDriversUseCase,
      inject: [LIVE_LOCATION_STORE],
      useFactory: (live: LiveLocationStore) => new FindNearbyDriversUseCase(live),
    },
    {
      provide: EstimateEtaUseCase,
      inject: [LIVE_LOCATION_STORE, ConfigService],
      useFactory: (live: LiveLocationStore, config: ConfigService) => new EstimateEtaUseCase(
        live,
        Number(config.get<string>('ETA_AVERAGE_SPEED_KPH', '28')),
        Number(config.get<string>('ETA_ROAD_FACTOR', '1.25')),
      ),
    },
  ],
})
export class AppModule {}

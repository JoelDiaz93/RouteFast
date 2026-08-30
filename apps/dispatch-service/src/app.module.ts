import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CancelDispatchHandler } from './application/commands/handlers/cancel-dispatch.handler';
import { CompleteCompensationHandler } from './application/commands/handlers/complete-compensation.handler';
import { CompleteDriverReservationHandler } from './application/commands/handlers/complete-driver-reservation.handler';
import { StartDispatchHandler } from './application/commands/handlers/start-dispatch.handler';
import { TimeoutDispatchHandler } from './application/commands/handlers/timeout-dispatch.handler';
import { DISPATCH_REPOSITORY } from './application/ports/dispatch.repository';
import { DISPATCH_WORKFLOW_TRANSACTION } from './application/ports/dispatch-workflow.transaction';
import { DriverScoringService } from './application/scoring/driver-scoring.service';
import { RoutePlannerService } from './application/optimization/route-planner.service';
import { GetDispatchHandler } from './application/queries/handlers/get-dispatch.handler';
import { ListDispatchesHandler } from './application/queries/handlers/list-dispatches.handler';
import { HealthModule } from './health/health.module';
import { DriverDirectoryClient } from './infrastructure/http/driver-directory.client';
import { TrackingGeoClient } from './infrastructure/http/tracking-geo.client';
import { DispatchTimeoutScheduler } from './infrastructure/jobs/dispatch-timeout.scheduler';
import { DispatchTimeoutWorker } from './infrastructure/jobs/dispatch-timeout.worker';
import { DispatchDecisionOrmEntity } from './infrastructure/persistence/typeorm/dispatch-decision.orm-entity';
import { DispatchDecisionReader } from './infrastructure/persistence/typeorm/dispatch-decision.reader';
import { DispatchOrmEntity } from './infrastructure/persistence/typeorm/dispatch.orm-entity';
import { TypeOrmDispatchRepository } from './infrastructure/persistence/typeorm/typeorm-dispatch.repository';
import { TypeOrmDispatchWorkflowTransaction } from './infrastructure/persistence/typeorm/typeorm-dispatch-workflow.transaction';
import { InboxOrmEntity } from './infrastructure/reliability/inbox.orm-entity';
import { InboxService } from './infrastructure/reliability/inbox.service';
import { OutboxOrmEntity } from './infrastructure/reliability/outbox.orm-entity';
import { OutboxWorker } from './infrastructure/reliability/outbox.worker';
import { RabbitOutboxTransport } from './infrastructure/reliability/rabbit-outbox.transport';
import { RmqReliabilityService } from './infrastructure/reliability/rmq-reliability.service';
import { DispatchEventsController } from './interfaces/events/dispatch-events.controller';
import { DispatchesController } from './interfaces/http/dispatches.controller';
import { OptimizationController } from './interfaces/http/optimization.controller';

import { MetricsModule } from './observability/metrics.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MetricsModule,
    CqrsModule,
    HttpModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DISPATCH_DB_HOST', 'localhost'),
        port: Number(config.get<string>('DISPATCH_DB_PORT', '55434')),
        username: config.get<string>('DISPATCH_DB_USER', 'routefast'),
        password: config.get<string>('DISPATCH_DB_PASSWORD', 'routefast'),
        database: config.get<string>('DISPATCH_DB_NAME', 'routefast_dispatch'),
        ssl: config.get<string>('DISPATCH_DB_SSL', 'false') === 'true',
        entities: [DispatchOrmEntity, DispatchDecisionOrmEntity, OutboxOrmEntity, InboxOrmEntity],
        synchronize: config.get<string>('DISPATCH_DB_SYNC', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([DispatchOrmEntity, DispatchDecisionOrmEntity, OutboxOrmEntity, InboxOrmEntity]),
    HealthModule,
  ],
  controllers: [DispatchEventsController, DispatchesController, OptimizationController],
  providers: [
    TypeOrmDispatchRepository,
    TypeOrmDispatchWorkflowTransaction,
    DispatchDecisionReader,
    InboxService,
    RabbitOutboxTransport,
    OutboxWorker,
    RmqReliabilityService,
    DispatchTimeoutScheduler,
    DispatchTimeoutWorker,
    DriverDirectoryClient,
    TrackingGeoClient,
    RoutePlannerService,
    {
      provide: DriverScoringService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new DriverScoringService({
        distanceWeight: Number(config.get<string>('DISPATCH_DRIVER_WEIGHT_DISTANCE', '0.55')),
        capacityWeight: Number(config.get<string>('DISPATCH_DRIVER_WEIGHT_CAPACITY', '0.20')),
        loadWeight: Number(config.get<string>('DISPATCH_DRIVER_WEIGHT_LOAD', '0.15')),
        freshnessWeight: Number(config.get<string>('DISPATCH_DRIVER_WEIGHT_FRESHNESS', '0.10')),
        maxLocationAgeSeconds: Number(config.get<string>('DISPATCH_LOCATION_MAX_AGE_SECONDS', '90')),
        averageSpeedKph: Number(config.get<string>('ETA_AVERAGE_SPEED_KPH', '28')),
        roadFactor: Number(config.get<string>('ETA_ROAD_FACTOR', '1.25')),
      }),
    },
    { provide: DISPATCH_REPOSITORY, useExisting: TypeOrmDispatchRepository },
    { provide: DISPATCH_WORKFLOW_TRANSACTION, useExisting: TypeOrmDispatchWorkflowTransaction },
    StartDispatchHandler,
    CompleteDriverReservationHandler,
    CancelDispatchHandler,
    CompleteCompensationHandler,
    TimeoutDispatchHandler,
    GetDispatchHandler,
    ListDispatchesHandler,
  ],
})
export class AppModule {}

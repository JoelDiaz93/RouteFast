import { Module } from '@nestjs/common';
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
import { GetDispatchHandler } from './application/queries/handlers/get-dispatch.handler';
import { ListDispatchesHandler } from './application/queries/handlers/list-dispatches.handler';
import { HealthModule } from './health/health.module';
import { DispatchTimeoutScheduler } from './infrastructure/jobs/dispatch-timeout.scheduler';
import { DispatchTimeoutWorker } from './infrastructure/jobs/dispatch-timeout.worker';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CqrsModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DISPATCH_DB_HOST', 'localhost'),
        port: Number(config.get<string>('DISPATCH_DB_PORT', '55434')),
        username: config.get<string>('DISPATCH_DB_USER', 'routefast'),
        password: config.get<string>('DISPATCH_DB_PASSWORD', 'routefast'),
        database: config.get<string>('DISPATCH_DB_NAME', 'routefast_dispatch'),
        entities: [DispatchOrmEntity, OutboxOrmEntity, InboxOrmEntity],
        synchronize: config.get<string>('DISPATCH_DB_SYNC', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([DispatchOrmEntity, OutboxOrmEntity, InboxOrmEntity]),
    HealthModule,
  ],
  controllers: [DispatchEventsController, DispatchesController],
  providers: [
    TypeOrmDispatchRepository,
    TypeOrmDispatchWorkflowTransaction,
    InboxService,
    RabbitOutboxTransport,
    OutboxWorker,
    RmqReliabilityService,
    DispatchTimeoutScheduler,
    DispatchTimeoutWorker,
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

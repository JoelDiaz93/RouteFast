import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompleteDriverReservationHandler } from './application/commands/handlers/complete-driver-reservation.handler';
import { StartDispatchHandler } from './application/commands/handlers/start-dispatch.handler';
import { DISPATCH_EVENT_PUBLISHER } from './application/ports/dispatch-event.publisher';
import { DISPATCH_REPOSITORY } from './application/ports/dispatch.repository';
import { GetDispatchHandler } from './application/queries/handlers/get-dispatch.handler';
import { ListDispatchesHandler } from './application/queries/handlers/list-dispatches.handler';
import { HealthModule } from './health/health.module';
import { RabbitDispatchEventPublisher } from './infrastructure/messaging/rabbit-dispatch-event.publisher';
import { DispatchOrmEntity } from './infrastructure/persistence/typeorm/dispatch.orm-entity';
import { TypeOrmDispatchRepository } from './infrastructure/persistence/typeorm/typeorm-dispatch.repository';
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
        entities: [DispatchOrmEntity],
        synchronize: config.get<string>('DISPATCH_DB_SYNC', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([DispatchOrmEntity]),
    HealthModule,
  ],
  controllers: [DispatchEventsController, DispatchesController],
  providers: [
    TypeOrmDispatchRepository,
    RabbitDispatchEventPublisher,
    { provide: DISPATCH_REPOSITORY, useExisting: TypeOrmDispatchRepository },
    { provide: DISPATCH_EVENT_PUBLISHER, useExisting: RabbitDispatchEventPublisher },
    StartDispatchHandler,
    CompleteDriverReservationHandler,
    GetDispatchHandler,
    ListDispatchesHandler,
  ],
})
export class AppModule {}

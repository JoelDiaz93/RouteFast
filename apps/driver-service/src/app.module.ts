import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DRIVER_RESERVATION_TRANSACTION, DriverReservationTransaction } from './application/ports/driver-reservation.transaction';
import { DRIVER_REPOSITORY, DriverRepository } from './application/ports/driver.repository';
import { CreateDriverUseCase } from './application/use-cases/create-driver.use-case';
import { ListDriversUseCase } from './application/use-cases/list-drivers.use-case';
import { ReleaseDriverReservationUseCase } from './application/use-cases/release-driver-reservation.use-case';
import { ReserveDriverUseCase } from './application/use-cases/reserve-driver.use-case';
import { SetDriverAvailabilityUseCase } from './application/use-cases/set-driver-availability.use-case';
import { HealthModule } from './health/health.module';
import { InboxOrmEntity } from './infrastructure/reliability/inbox.orm-entity';
import { InboxService } from './infrastructure/reliability/inbox.service';
import { OutboxOrmEntity } from './infrastructure/reliability/outbox.orm-entity';
import { OutboxWorker } from './infrastructure/reliability/outbox.worker';
import { RabbitOutboxTransport } from './infrastructure/reliability/rabbit-outbox.transport';
import { RmqReliabilityService } from './infrastructure/reliability/rmq-reliability.service';
import { DriverOrmEntity } from './infrastructure/persistence/typeorm/driver.orm-entity';
import { DriverReservationOrmEntity } from './infrastructure/persistence/typeorm/driver-reservation.orm-entity';
import { TypeOrmDriverRepository } from './infrastructure/persistence/typeorm/typeorm-driver.repository';
import { TypeOrmDriverReservationTransaction } from './infrastructure/persistence/typeorm/typeorm-driver-reservation.transaction';
import { DriverEventsController } from './interfaces/events/driver-events.controller';
import { DriversController } from './interfaces/http/drivers.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DRIVER_DB_HOST', 'localhost'),
        port: Number(config.get<string>('DRIVER_DB_PORT', '55433')),
        username: config.get<string>('DRIVER_DB_USER', 'routefast'),
        password: config.get<string>('DRIVER_DB_PASSWORD', 'routefast'),
        database: config.get<string>('DRIVER_DB_NAME', 'routefast_drivers'),
        entities: [DriverOrmEntity, DriverReservationOrmEntity, OutboxOrmEntity, InboxOrmEntity],
        synchronize: config.get<string>('DRIVER_DB_SYNC', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([DriverOrmEntity, DriverReservationOrmEntity, OutboxOrmEntity, InboxOrmEntity]),
    HealthModule,
  ],
  controllers: [DriversController, DriverEventsController],
  providers: [
    TypeOrmDriverRepository,
    TypeOrmDriverReservationTransaction,
    InboxService,
    RabbitOutboxTransport,
    OutboxWorker,
    RmqReliabilityService,
    { provide: DRIVER_REPOSITORY, useExisting: TypeOrmDriverRepository },
    { provide: DRIVER_RESERVATION_TRANSACTION, useExisting: TypeOrmDriverReservationTransaction },
    {
      provide: CreateDriverUseCase,
      inject: [DRIVER_REPOSITORY],
      useFactory: (repository: DriverRepository) => new CreateDriverUseCase(repository),
    },
    {
      provide: ListDriversUseCase,
      inject: [DRIVER_REPOSITORY],
      useFactory: (repository: DriverRepository) => new ListDriversUseCase(repository),
    },
    {
      provide: SetDriverAvailabilityUseCase,
      inject: [DRIVER_REPOSITORY],
      useFactory: (repository: DriverRepository) => new SetDriverAvailabilityUseCase(repository),
    },
    {
      provide: ReserveDriverUseCase,
      inject: [DRIVER_RESERVATION_TRANSACTION],
      useFactory: (transaction: DriverReservationTransaction) => new ReserveDriverUseCase(transaction),
    },
    {
      provide: ReleaseDriverReservationUseCase,
      inject: [DRIVER_RESERVATION_TRANSACTION],
      useFactory: (transaction: DriverReservationTransaction) => new ReleaseDriverReservationUseCase(transaction),
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DRIVER_EVENT_PUBLISHER, DriverEventPublisher } from './application/ports/driver-event.publisher';
import { DRIVER_REPOSITORY, DriverRepository } from './application/ports/driver.repository';
import { CreateDriverUseCase } from './application/use-cases/create-driver.use-case';
import { ListDriversUseCase } from './application/use-cases/list-drivers.use-case';
import { ReserveDriverUseCase } from './application/use-cases/reserve-driver.use-case';
import { SetDriverAvailabilityUseCase } from './application/use-cases/set-driver-availability.use-case';
import { HealthModule } from './health/health.module';
import { RabbitDriverEventPublisher } from './infrastructure/messaging/rabbit-driver-event.publisher';
import { DriverOrmEntity } from './infrastructure/persistence/typeorm/driver.orm-entity';
import { TypeOrmDriverRepository } from './infrastructure/persistence/typeorm/typeorm-driver.repository';
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
        entities: [DriverOrmEntity],
        synchronize: config.get<string>('DRIVER_DB_SYNC', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([DriverOrmEntity]),
    HealthModule,
  ],
  controllers: [DriversController, DriverEventsController],
  providers: [
    TypeOrmDriverRepository,
    RabbitDriverEventPublisher,
    { provide: DRIVER_REPOSITORY, useExisting: TypeOrmDriverRepository },
    { provide: DRIVER_EVENT_PUBLISHER, useExisting: RabbitDriverEventPublisher },
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
      inject: [DRIVER_REPOSITORY, DRIVER_EVENT_PUBLISHER],
      useFactory: (repository: DriverRepository, publisher: DriverEventPublisher) => new ReserveDriverUseCase(repository, publisher),
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ORDER_EVENT_PUBLISHER, OrderEventPublisher } from './application/ports/order-event.publisher';
import { ORDER_REPOSITORY, OrderRepository } from './application/ports/order.repository';
import { AssignOrderDriverUseCase } from './application/use-cases/assign-order-driver.use-case';
import { CancelOrderUseCase } from './application/use-cases/cancel-order.use-case';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { ListOrdersUseCase } from './application/use-cases/list-orders.use-case';
import { MarkDispatchFailedUseCase } from './application/use-cases/mark-dispatch-failed.use-case';
import { MarkOrderDispatchingUseCase } from './application/use-cases/mark-order-dispatching.use-case';
import { HealthModule } from './health/health.module';
import { RabbitOrderEventPublisher } from './infrastructure/messaging/rabbit-order-event.publisher';
import { OrderOrmEntity } from './infrastructure/persistence/typeorm/order.orm-entity';
import { TypeOrmOrderRepository } from './infrastructure/persistence/typeorm/typeorm-order.repository';
import { OrderEventsController } from './interfaces/events/order-events.controller';
import { OrdersController } from './interfaces/http/orders.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('ORDER_DB_HOST', 'localhost'),
        port: Number(config.get<string>('ORDER_DB_PORT', '55432')),
        username: config.get<string>('ORDER_DB_USER', 'routefast'),
        password: config.get<string>('ORDER_DB_PASSWORD', 'routefast'),
        database: config.get<string>('ORDER_DB_NAME', 'routefast_orders'),
        entities: [OrderOrmEntity],
        synchronize: config.get<string>('ORDER_DB_SYNC', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([OrderOrmEntity]),
    HealthModule,
  ],
  controllers: [OrdersController, OrderEventsController],
  providers: [
    TypeOrmOrderRepository,
    RabbitOrderEventPublisher,
    { provide: ORDER_REPOSITORY, useExisting: TypeOrmOrderRepository },
    { provide: ORDER_EVENT_PUBLISHER, useExisting: RabbitOrderEventPublisher },
    { provide: CreateOrderUseCase, inject: [ORDER_REPOSITORY, ORDER_EVENT_PUBLISHER], useFactory: (r: OrderRepository, p: OrderEventPublisher) => new CreateOrderUseCase(r, p) },
    { provide: GetOrderUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new GetOrderUseCase(r) },
    { provide: ListOrdersUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new ListOrdersUseCase(r) },
    { provide: CancelOrderUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new CancelOrderUseCase(r) },
    { provide: MarkOrderDispatchingUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new MarkOrderDispatchingUseCase(r) },
    { provide: AssignOrderDriverUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new AssignOrderDriverUseCase(r) },
    { provide: MarkDispatchFailedUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new MarkDispatchFailedUseCase(r) },
  ],
})
export class AppModule {}

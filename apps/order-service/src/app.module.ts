import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ORDER_CREATION_TRANSACTION, OrderCreationTransaction } from './application/ports/order-creation.transaction';
import { ORDER_REPOSITORY, OrderRepository } from './application/ports/order.repository';
import { AssignOrderDriverUseCase } from './application/use-cases/assign-order-driver.use-case';
import { CancelOrderUseCase } from './application/use-cases/cancel-order.use-case';
import { CompleteDispatchCancellationUseCase } from './application/use-cases/complete-dispatch-cancellation.use-case';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { ListOrdersUseCase } from './application/use-cases/list-orders.use-case';
import { MarkDispatchFailedUseCase } from './application/use-cases/mark-dispatch-failed.use-case';
import { MarkOrderDispatchingUseCase } from './application/use-cases/mark-order-dispatching.use-case';
import { HealthModule } from './health/health.module';
import { InboxOrmEntity } from './infrastructure/reliability/inbox.orm-entity';
import { InboxService } from './infrastructure/reliability/inbox.service';
import { OutboxOrmEntity } from './infrastructure/reliability/outbox.orm-entity';
import { OutboxWorker } from './infrastructure/reliability/outbox.worker';
import { RabbitOutboxTransport } from './infrastructure/reliability/rabbit-outbox.transport';
import { RmqReliabilityService } from './infrastructure/reliability/rmq-reliability.service';
import { OrderOrmEntity } from './infrastructure/persistence/typeorm/order.orm-entity';
import { TypeOrmOrderCreationTransaction } from './infrastructure/persistence/typeorm/typeorm-order-creation.transaction';
import { TypeOrmOrderRepository } from './infrastructure/persistence/typeorm/typeorm-order.repository';
import { OrderEventsController } from './interfaces/events/order-events.controller';
import { OrdersController } from './interfaces/http/orders.controller';

import { MetricsModule } from './observability/metrics.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MetricsModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('ORDER_DB_HOST', 'localhost'),
        port: Number(config.get<string>('ORDER_DB_PORT', '55432')),
        username: config.get<string>('ORDER_DB_USER', 'routefast'),
        password: config.get<string>('ORDER_DB_PASSWORD', 'routefast'),
        database: config.get<string>('ORDER_DB_NAME', 'routefast_orders'),
        ssl: config.get<string>('ORDER_DB_SSL', 'false') === 'true',
        entities: [OrderOrmEntity, OutboxOrmEntity, InboxOrmEntity],
        synchronize: config.get<string>('ORDER_DB_SYNC', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([OrderOrmEntity, OutboxOrmEntity, InboxOrmEntity]),
    HealthModule,
  ],
  controllers: [OrdersController, OrderEventsController],
  providers: [
    TypeOrmOrderRepository,
    TypeOrmOrderCreationTransaction,
    InboxService,
    RabbitOutboxTransport,
    OutboxWorker,
    RmqReliabilityService,
    { provide: ORDER_REPOSITORY, useExisting: TypeOrmOrderRepository },
    { provide: ORDER_CREATION_TRANSACTION, useExisting: TypeOrmOrderCreationTransaction },
    {
      provide: CreateOrderUseCase,
      inject: [ORDER_CREATION_TRANSACTION],
      useFactory: (transaction: OrderCreationTransaction) => new CreateOrderUseCase(transaction),
    },
    { provide: GetOrderUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new GetOrderUseCase(r) },
    { provide: ListOrdersUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new ListOrdersUseCase(r) },
    { provide: CancelOrderUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new CancelOrderUseCase(r) },
    { provide: MarkOrderDispatchingUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new MarkOrderDispatchingUseCase(r) },
    { provide: AssignOrderDriverUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new AssignOrderDriverUseCase(r) },
    { provide: MarkDispatchFailedUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new MarkDispatchFailedUseCase(r) },
    { provide: CompleteDispatchCancellationUseCase, inject: [ORDER_REPOSITORY], useFactory: (r: OrderRepository) => new CompleteDispatchCancellationUseCase(r) },
  ],
})
export class AppModule {}

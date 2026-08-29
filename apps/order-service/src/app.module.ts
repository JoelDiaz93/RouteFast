import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ORDER_REPOSITORY, OrderRepository } from './application/ports/order.repository';
import { CancelOrderUseCase } from './application/use-cases/cancel-order.use-case';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { ListOrdersUseCase } from './application/use-cases/list-orders.use-case';
import { HealthModule } from './health/health.module';
import { TypeOrmOrderRepository } from './infrastructure/persistence/typeorm/typeorm-order.repository';
import { OrderOrmEntity } from './infrastructure/persistence/typeorm/order.orm-entity';
import { OrdersController } from './interfaces/http/orders.controller';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('ORDER_DB_HOST', 'localhost'),
        port: Number(config.get<string>('ORDER_DB_PORT', '5432')),
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
  controllers: [OrdersController],
  providers: [
    TypeOrmOrderRepository,
    {
      provide: ORDER_REPOSITORY,
      useExisting: TypeOrmOrderRepository,
    },
    {
      provide: CreateOrderUseCase,
      inject: [ORDER_REPOSITORY],
      useFactory: (repository: OrderRepository) => new CreateOrderUseCase(repository),
    },
    {
      provide: GetOrderUseCase,
      inject: [ORDER_REPOSITORY],
      useFactory: (repository: OrderRepository) => new GetOrderUseCase(repository),
    },
    {
      provide: ListOrdersUseCase,
      inject: [ORDER_REPOSITORY],
      useFactory: (repository: OrderRepository) => new ListOrdersUseCase(repository),
    },
    {
      provide: CancelOrderUseCase,
      inject: [ORDER_REPOSITORY],
      useFactory: (repository: OrderRepository) => new CancelOrderUseCase(repository),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

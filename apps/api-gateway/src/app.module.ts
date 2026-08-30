import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DispatchModule } from './dispatch/dispatch.module';
import { DriversModule } from './drivers/drivers.module';
import { HealthModule } from './health/health.module';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { OrdersModule } from './orders/orders.module';
import { TrackingModule } from './tracking/tracking.module';
import { OptimizationModule } from './optimization/optimization.module';
import { MetricsModule } from './observability/metrics.module';
@Module({ imports:[ConfigModule.forRoot({isGlobal:true}),MetricsModule,HealthModule,OrdersModule,DriversModule,DispatchModule,TrackingModule,OptimizationModule] })
export class AppModule implements NestModule {
  configure(consumer:MiddlewareConsumer):void{consumer.apply(CorrelationIdMiddleware).forRoutes('{*splat}');}
}

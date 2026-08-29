import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DispatchModule } from './dispatch/dispatch.module';
import { DriversModule } from './drivers/drivers.module';
import { HealthModule } from './health/health.module';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { OrdersModule } from './orders/orders.module';
@Module({ imports:[ConfigModule.forRoot({isGlobal:true}),HealthModule,OrdersModule,DriversModule,DispatchModule] })
export class AppModule implements NestModule {
  configure(consumer:MiddlewareConsumer):void{consumer.apply(CorrelationIdMiddleware).forRoutes('*');}
}

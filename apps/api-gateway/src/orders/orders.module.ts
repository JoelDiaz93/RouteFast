import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { OrdersClient } from './orders.client';
import { OrdersController } from './orders.controller';

@Module({
  imports: [HttpModule],
  controllers: [OrdersController],
  providers: [OrdersClient],
})
export class OrdersModule {}

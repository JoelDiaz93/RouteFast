import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';
import { CreateOrderDto } from './create-order.dto';
import { OrdersClient } from './orders.client';

type DownstreamError = Error & { status?: number; payload?: object | string };

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersClient: OrdersClient) {}

  @Post()
  async create(@Body() body: CreateOrderDto, @Req() req: Request): Promise<unknown> {
    return this.forward(() => this.ordersClient.create(body, this.correlationId(req)));
  }

  @Get()
  async list(@Req() req: Request): Promise<unknown> {
    return this.forward(() => this.ordersClient.list(this.correlationId(req)));
  }

  @Get(':orderId')
  async getById(@Param('orderId') orderId: string, @Req() req: Request): Promise<unknown> {
    return this.forward(() => this.ordersClient.getById(orderId, this.correlationId(req)));
  }

  @Patch(':orderId/cancel')
  async cancel(@Param('orderId') orderId: string, @Req() req: Request): Promise<unknown> {
    return this.forward(() => this.ordersClient.cancel(orderId, this.correlationId(req)));
  }

  private correlationId(req: Request): string {
    return String(req.headers[CORRELATION_ID_HEADER]);
  }

  private async forward(operation: () => Promise<unknown>): Promise<unknown> {
    try {
      return await operation();
    } catch (error) {
      const downstream = error as DownstreamError;
      if (downstream.status) {
        throw new HttpException(downstream.payload ?? downstream.message, downstream.status);
      }
      throw error;
    }
  }
}

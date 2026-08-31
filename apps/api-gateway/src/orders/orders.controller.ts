import {
  Body,
  Controller,
  Headers,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Req,
  Query,
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
  async create(
    @Body() body: CreateOrderDto,
    @Req() req: Request,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<unknown> {
    return this.forward(() => this.ordersClient.create(body, this.correlationId(req), idempotencyKey));
  }

  @Get()
  async list(@Req() req: Request, @Query('limit') rawLimit?: string): Promise<unknown> {
    const limit = this.limit(rawLimit);
    return this.forward(() => this.ordersClient.list(this.correlationId(req), limit));
  }

  @Get(':orderId')
  async getById(@Param('orderId') orderId: string, @Req() req: Request): Promise<unknown> {
    return this.forward(() => this.ordersClient.getById(orderId, this.correlationId(req)));
  }

  @Patch(':orderId/cancel')
  async cancel(@Param('orderId') orderId: string, @Req() req: Request): Promise<unknown> {
    return this.forward(() => this.ordersClient.cancel(orderId, this.correlationId(req)));
  }

  private limit(raw?: string): number {
    const parsed = Number(raw ?? 100);
    return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), 500) : 100;
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

import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CreateOrderDto } from './create-order.dto';

@Injectable()
export class OrdersClient {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('ORDER_SERVICE_URL', 'http://localhost:3001');
  }

  async create(body: CreateOrderDto, correlationId: string, idempotencyKey?: string): Promise<unknown> {
    return this.request('post', '/orders', correlationId, body, idempotencyKey);
  }

  async list(correlationId: string): Promise<unknown> {
    return this.request('get', '/orders', correlationId);
  }

  async getById(orderId: string, correlationId: string): Promise<unknown> {
    return this.request('get', `/orders/${encodeURIComponent(orderId)}`, correlationId);
  }

  async cancel(orderId: string, correlationId: string): Promise<unknown> {
    return this.request('patch', `/orders/${encodeURIComponent(orderId)}/cancel`, correlationId);
  }

  private async request(
    method: 'get' | 'post' | 'patch',
    path: string,
    correlationId: string,
    data?: unknown,
    idempotencyKey?: string,
  ): Promise<unknown> {
    try {
      const response = await firstValueFrom(
        this.http.request({
          method,
          url: `${this.baseUrl}${path}`,
          data,
          headers: {
            'x-correlation-id': correlationId,
            ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
          },
          timeout: 3000,
        }),
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const status = error.response.status;
        const payload = error.response.data;
        throw Object.assign(new Error('Order Service request failed'), {
          status,
          payload: payload as object | string,
        });
      }

      throw new ServiceUnavailableException('Order Service is unavailable');
    }
  }
}

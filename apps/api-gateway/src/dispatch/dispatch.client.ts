import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CancelDispatchDto } from './dto/cancel-dispatch.dto';

@Injectable()
export class DispatchClient {
  private readonly baseUrl: string;
  constructor(private readonly http: HttpService, config: ConfigService) {
    this.baseUrl = config.get<string>('DISPATCH_SERVICE_URL', 'http://localhost:3003');
  }

  list(correlationId: string): Promise<unknown> { return this.request('get', '/dispatches', correlationId); }
  get(id: string, correlationId: string): Promise<unknown> {
    return this.request('get', `/dispatches/${encodeURIComponent(id)}`, correlationId);
  }
  decision(id: string, correlationId: string): Promise<unknown> {
    return this.request('get', `/dispatches/${encodeURIComponent(id)}/decision`, correlationId);
  }
  cancel(id: string, body: CancelDispatchDto, correlationId: string): Promise<unknown> {
    return this.request('post', `/dispatches/${encodeURIComponent(id)}/cancel`, correlationId, body);
  }
  routePlan(body: Record<string, unknown>, correlationId: string): Promise<unknown> {
    return this.request('post', '/optimization/route-plan', correlationId, body);
  }

  private async request(
    method: 'get' | 'post',
    path: string,
    correlationId: string,
    data?: unknown,
  ): Promise<unknown> {
    try {
      const response = await firstValueFrom(this.http.request({
        method,
        url: `${this.baseUrl}${path}`,
        data,
        headers: { 'x-correlation-id': correlationId },
        timeout: 3000,
      }));
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw Object.assign(new Error('Dispatch Service request failed'), {
          status: error.response.status,
          payload: error.response.data as object | string,
        });
      }
      throw new ServiceUnavailableException('Dispatch Service is unavailable');
    }
  }
}

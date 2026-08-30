import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TrackingClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly http: HttpService, config: ConfigService) {
    this.baseUrl = config.get<string>('TRACKING_SERVICE_URL', 'http://localhost:3004');
    this.timeoutMs = Number(config.get<string>('DEPENDENCY_TIMEOUT_MS', '3000'));
  }

  update(body: unknown, correlationId: string) { return this.request('post', '/tracking/locations', correlationId, body); }
  latest(driverId: string, correlationId: string) { return this.request('get', `/tracking/drivers/${encodeURIComponent(driverId)}/latest`, correlationId); }
  history(driverId: string, correlationId: string, limit?: string) {
    return this.request('get', `/tracking/drivers/${encodeURIComponent(driverId)}/history`, correlationId, undefined, { limit });
  }
  nearby(body: unknown, correlationId: string) { return this.request('post', '/tracking/nearby', correlationId, body); }
  eta(body: unknown, correlationId: string) { return this.request('post', '/tracking/eta', correlationId, body); }

  private async request(method: 'get' | 'post', path: string, correlationId: string, data?: unknown, params?: object): Promise<unknown> {
    try {
      const response = await firstValueFrom(this.http.request({
        method, url: `${this.baseUrl}${path}`, data, params,
        headers: { 'x-correlation-id': correlationId }, timeout: this.timeoutMs,
      }));
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw Object.assign(new Error('Tracking Service request failed'), {
          status: error.response.status,
          payload: error.response.data as object | string,
        });
      }
      throw new ServiceUnavailableException('Tracking Service is unavailable');
    }
  }
}

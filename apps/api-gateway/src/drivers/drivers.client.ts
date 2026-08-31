import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CreateDriverDto } from './create-driver.dto';
import { SetDriverAvailabilityDto } from './set-driver-availability.dto';

@Injectable()
export class DriversClient {
  private readonly baseUrl: string;
  constructor(private readonly http: HttpService, config: ConfigService) {
    this.baseUrl = config.get<string>('DRIVER_SERVICE_URL', 'http://localhost:3002');
  }
  create(body: CreateDriverDto, correlationId: string): Promise<unknown> { return this.request('post','/drivers',correlationId,body); }
  list(correlationId: string, limit = 100): Promise<unknown> { return this.request('get',`/drivers?limit=${limit}`,correlationId); }
  availability(driverId: string, body: SetDriverAvailabilityDto, correlationId: string): Promise<unknown> {
    return this.request('patch',`/drivers/${encodeURIComponent(driverId)}/availability`,correlationId,body);
  }
  private async request(method:'get'|'post'|'patch', path:string, correlationId:string, data?:unknown): Promise<unknown> {
    try {
      const response = await firstValueFrom(this.http.request({method,url:`${this.baseUrl}${path}`,data,headers:{'x-correlation-id':correlationId},timeout:3000}));
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw Object.assign(new Error('Driver Service request failed'), {status:error.response.status,payload:error.response.data as object|string});
      }
      throw new ServiceUnavailableException('Driver Service is unavailable');
    }
  }
}

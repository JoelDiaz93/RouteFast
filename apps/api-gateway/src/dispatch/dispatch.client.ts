import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
@Injectable()
export class DispatchClient {
  private readonly baseUrl:string;
  constructor(private readonly http:HttpService,config:ConfigService){this.baseUrl=config.get<string>('DISPATCH_SERVICE_URL','http://localhost:3003');}
  list(correlationId:string):Promise<unknown>{return this.request(`/dispatches`,correlationId);}
  get(id:string,correlationId:string):Promise<unknown>{return this.request(`/dispatches/${encodeURIComponent(id)}`,correlationId);}
  private async request(path:string,correlationId:string):Promise<unknown>{
    try{const response=await firstValueFrom(this.http.get(`${this.baseUrl}${path}`,{headers:{'x-correlation-id':correlationId},timeout:3000}));return response.data;}
    catch(error){if(error instanceof AxiosError&&error.response){throw Object.assign(new Error('Dispatch Service request failed'),{status:error.response.status,payload:error.response.data as object|string});}throw new ServiceUnavailableException('Dispatch Service is unavailable');}
  }
}

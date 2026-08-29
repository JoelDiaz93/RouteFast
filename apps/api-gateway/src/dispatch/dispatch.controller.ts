import { Controller, Get, HttpException, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';
import { DispatchClient } from './dispatch.client';
type DownstreamError=Error&{status?:number;payload?:object|string};
@Controller('dispatches')
export class DispatchController {
  constructor(private readonly client:DispatchClient){}
  @Get() list(@Req() req:Request):Promise<unknown>{return this.forward(()=>this.client.list(this.correlationId(req)));}
  @Get(':dispatchId') get(@Param('dispatchId') id:string,@Req() req:Request):Promise<unknown>{return this.forward(()=>this.client.get(id,this.correlationId(req)));}
  private correlationId(req:Request):string{return String(req.headers[CORRELATION_ID_HEADER]);}
  private async forward(operation:()=>Promise<unknown>):Promise<unknown>{try{return await operation();}catch(error){const e=error as DownstreamError;if(e.status)throw new HttpException(e.payload??e.message,e.status);throw error;}}
}

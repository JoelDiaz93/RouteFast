import { Body, Controller, Get, HttpException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';
import { CreateDriverDto } from './create-driver.dto';
import { DriversClient } from './drivers.client';
import { SetDriverAvailabilityDto } from './set-driver-availability.dto';
type DownstreamError = Error & { status?: number; payload?: object | string };
@Controller('drivers')
export class DriversController {
  constructor(private readonly client: DriversClient) {}
  @Post() create(@Body() body: CreateDriverDto,@Req() req:Request):Promise<unknown>{return this.forward(()=>this.client.create(body,this.correlationId(req)));}
  @Get() list(@Req() req:Request):Promise<unknown>{return this.forward(()=>this.client.list(this.correlationId(req)));}
  @Patch(':driverId/availability') availability(@Param('driverId') id:string,@Body() body:SetDriverAvailabilityDto,@Req() req:Request):Promise<unknown>{
    return this.forward(()=>this.client.availability(id,body,this.correlationId(req)));
  }
  private correlationId(req:Request):string{return String(req.headers[CORRELATION_ID_HEADER]);}
  private async forward(operation:()=>Promise<unknown>):Promise<unknown>{
    try{return await operation();}catch(error){const e=error as DownstreamError;if(e.status)throw new HttpException(e.payload??e.message,e.status);throw error;}
  }
}

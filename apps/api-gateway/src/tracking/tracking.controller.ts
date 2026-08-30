import { Body, Controller, Get, HttpException, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';
import { TrackingClient } from './tracking.client';

type DownstreamError = Error & { status?: number; payload?: object | string };

@Controller('tracking')
export class TrackingController {
  constructor(private readonly client: TrackingClient) {}

  @Post('locations') update(@Body() body: unknown, @Req() req: Request) {
    return this.forward(() => this.client.update(body, this.correlationId(req)));
  }
  @Get('drivers/:driverId/latest') latest(@Param('driverId') driverId: string, @Req() req: Request) {
    return this.forward(() => this.client.latest(driverId, this.correlationId(req)));
  }
  @Get('drivers/:driverId/history') history(@Param('driverId') driverId: string, @Req() req: Request, @Query('limit') limit?: string) {
    return this.forward(() => this.client.history(driverId, this.correlationId(req), limit));
  }
  @Post('nearby') nearby(@Body() body: unknown, @Req() req: Request) {
    return this.forward(() => this.client.nearby(body, this.correlationId(req)));
  }
  @Post('eta') eta(@Body() body: unknown, @Req() req: Request) {
    return this.forward(() => this.client.eta(body, this.correlationId(req)));
  }

  private correlationId(req: Request): string { return String(req.headers[CORRELATION_ID_HEADER]); }
  private async forward(operation: () => Promise<unknown>): Promise<unknown> {
    try { return await operation(); }
    catch (error) {
      const downstream = error as DownstreamError;
      if (downstream.status) throw new HttpException(downstream.payload ?? downstream.message, downstream.status);
      throw error;
    }
  }
}

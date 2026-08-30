import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';
import { DispatchClient } from '../dispatch/dispatch.client';

@Controller('optimization')
export class OptimizationController {
  constructor(private readonly dispatchClient: DispatchClient) {}

  @Post('route-plan')
  routePlan(@Body() body: Record<string, unknown>, @Req() request: Request): Promise<unknown> {
    return this.dispatchClient.routePlan(body, String(request.headers[CORRELATION_ID_HEADER]));
  }
}

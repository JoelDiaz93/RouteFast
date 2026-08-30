import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  private payload(status: 'ok' | 'ready') {
    return {
      status,
      service: 'api-gateway',
      phase: 5,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  getHealth() { return this.payload('ok'); }

  @Get('live')
  live() { return this.payload('ok'); }

  @Get('ready')
  ready() { return this.payload('ready'); }
}

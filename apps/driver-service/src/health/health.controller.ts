import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}
  @Get() health(): object { return { service: 'driver-service', status: 'ok' }; }
  @Get('live')
  live(): object { return { service: 'driver-service', status: 'ok', phase: 5 }; }

  @Get('ready') async ready(): Promise<object> {
    try { await this.dataSource.query('SELECT 1'); return { service: 'driver-service', status: 'ready' }; }
    catch { throw new ServiceUnavailableException('driver database unavailable'); }
  }
}

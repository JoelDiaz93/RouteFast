import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}
  @Get() health(): object { return { service: 'dispatch-service', status: 'ok' }; }
  @Get('ready') async ready(): Promise<object> {
    try { await this.dataSource.query('SELECT 1'); return { service: 'dispatch-service', status: 'ready' }; }
    catch { throw new ServiceUnavailableException('dispatch database unavailable'); }
  }
}

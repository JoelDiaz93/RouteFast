import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  health() { return { service: 'tracking-service', status: 'ok', phase: 5 }; }

  @Get('live')
  live() { return { service: 'tracking-service', status: 'ok', phase: 5 }; }

  @Get('ready')
  async ready() {
    try {
      await this.dataSource.query('SELECT PostGIS_Version()');
      return { service: 'tracking-service', status: 'ready', postgis: true, phase: 5 };
    } catch {
      throw new ServiceUnavailableException('tracking PostGIS database unavailable');
    }
  }
}

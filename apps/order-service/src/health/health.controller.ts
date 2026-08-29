import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  health(): { status: string; service: string } {
    return { status: 'ok', service: 'order-service' };
  }

  @Get('ready')
  async ready(): Promise<{ status: string; database: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ready', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database is not ready');
    }
  }
}

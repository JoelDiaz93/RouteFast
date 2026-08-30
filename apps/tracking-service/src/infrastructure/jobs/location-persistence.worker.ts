import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { DriverLocationView } from '../../application/models/location.view';
import { PostgisLocationHistoryRepository } from '../postgis/postgis-location-history.repository';
import { PostgisSchemaBootstrap } from '../postgis/postgis-schema.bootstrap';

@Injectable()
export class LocationPersistenceWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<DriverLocationView> | null = null;

  constructor(
    private readonly repository: PostgisLocationHistoryRepository,
    private readonly config: ConfigService,
    private readonly schema: PostgisSchemaBootstrap,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.schema.ensureReady();
    const queueName = this.config.get<string>('TRACKING_PERSISTENCE_QUEUE', 'routefast.tracking.persistence');
    this.worker = new Worker<DriverLocationView>(queueName, async (job) => {
      await this.repository.append(job.data);
    }, {
      connection: {
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: Number(this.config.get<string>('REDIS_PORT', '6379')),
        password: this.config.get<string>('REDIS_PASSWORD') || undefined,
        tls: this.config.get<string>('REDIS_TLS', 'false') === 'true' ? {} : undefined,
      },
      concurrency: 8,
    });
  }

  async onModuleDestroy(): Promise<void> { await this.worker?.close(); }
}

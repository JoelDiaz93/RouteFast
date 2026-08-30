import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DriverLocationView } from '../../application/models/location.view';
import { LocationPersistenceQueue } from '../../application/ports/location-persistence.queue';

@Injectable()
export class BullLocationPersistenceQueue implements LocationPersistenceQueue, OnModuleDestroy {
  readonly queueName: string;
  private readonly queue: Queue<DriverLocationView>;

  constructor(config: ConfigService) {
    this.queueName = config.get<string>('TRACKING_PERSISTENCE_QUEUE', 'routefast.tracking.persistence');
    this.queue = new Queue<DriverLocationView>(this.queueName, {
      connection: {
        host: config.get<string>('REDIS_HOST', 'localhost'),
        port: Number(config.get<string>('REDIS_PORT', '6379')),
        password: config.get<string>('REDIS_PASSWORD') || undefined,
        tls: config.get<string>('REDIS_TLS', 'false') === 'true' ? {} : undefined,
      },
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 1000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 500 },
      },
    });
  }

  async enqueue(location: DriverLocationView): Promise<void> {
    await this.queue.add('persist-location', location, {
      jobId: `${location.driverId}-${new Date(location.recordedAt).getTime()}`,
    });
  }

  async onModuleDestroy(): Promise<void> { await this.queue.close(); }
}

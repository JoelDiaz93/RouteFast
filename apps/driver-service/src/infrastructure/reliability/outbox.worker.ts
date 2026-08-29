import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { OutboxOrmEntity, OutboxStatus } from './outbox.orm-entity';
import { RabbitOutboxTransport } from './rabbit-outbox.transport';

@Injectable()
export class OutboxWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly intervalMs: number;
  private readonly batchSize: number;

  constructor(
    @InjectRepository(OutboxOrmEntity) private readonly repository: Repository<OutboxOrmEntity>,
    private readonly transport: RabbitOutboxTransport,
    config: ConfigService,
  ) {
    this.intervalMs = Number(config.get<string>('OUTBOX_POLL_INTERVAL_MS', '500'));
    this.batchSize = Number(config.get<string>('OUTBOX_BATCH_SIZE', '25'));
  }

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.flush(), this.intervalMs);
    void this.flush();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async flush(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const events = await this.repository.find({
        where: { status: OutboxStatus.PENDING, availableAt: LessThanOrEqual(new Date()) },
        order: { createdAt: 'ASC' },
        take: this.batchSize,
      });

      for (const event of events) {
        try {
          await this.transport.publish(event);
          event.status = OutboxStatus.PUBLISHED;
          event.publishedAt = new Date();
          event.attempts += 1;
          await this.repository.save(event);
        } catch (error) {
          event.attempts += 1;
          const delayMs = Math.min(30_000, 500 * 2 ** Math.min(event.attempts, 6));
          event.availableAt = new Date(Date.now() + delayMs);
          await this.repository.save(event);
          this.logger.warn(`Outbox publish failed for ${event.id}; retry in ${delayMs}ms`);
        }
      }
    } finally {
      this.running = false;
    }
  }
}

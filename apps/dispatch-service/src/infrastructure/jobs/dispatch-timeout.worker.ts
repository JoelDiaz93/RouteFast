import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { Worker } from 'bullmq';
import { TimeoutDispatchCommand } from '../../application/commands/timeout-dispatch.command';

interface DispatchTimeoutJob { dispatchId: string; correlationId: string; }

@Injectable()
export class DispatchTimeoutWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private worker?: Worker<DispatchTimeoutJob>;

  constructor(private readonly commandBus: CommandBus, private readonly config: ConfigService) {}

  onApplicationBootstrap(): void {
    this.worker = new Worker<DispatchTimeoutJob>(
      'routefast-dispatch-timeouts',
      async (job) => {
        await this.commandBus.execute(new TimeoutDispatchCommand(job.data.dispatchId, job.data.correlationId));
      },
      {
        connection: {
          host: this.config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(this.config.get<string>('REDIS_PORT', '6379')),
          password: this.config.get<string>('REDIS_PASSWORD') || undefined,
          tls: this.config.get<string>('REDIS_TLS', 'false') === 'true' ? {} : undefined,
        },
        concurrency: 4,
      },
    );
  }

  async onModuleDestroy(): Promise<void> { await this.worker?.close(); }
}

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

interface DispatchTimeoutJob { dispatchId: string; correlationId: string; }

@Injectable()
export class DispatchTimeoutScheduler implements OnModuleDestroy {
  private readonly queue: Queue<DispatchTimeoutJob>;
  private readonly delayMs: number;

  constructor(config: ConfigService) {
    this.delayMs = Number(config.get<string>('DISPATCH_ASSIGNMENT_TIMEOUT_MS', '30000'));
    this.queue = new Queue<DispatchTimeoutJob>('routefast-dispatch-timeouts', {
      connection: {
        host: config.get<string>('REDIS_HOST', 'localhost'),
        port: Number(config.get<string>('REDIS_PORT', '6379')),
      },
    });
  }

  async schedule(dispatchId: string, correlationId: string): Promise<void> {
    await this.queue.add('assignment-timeout', { dispatchId, correlationId }, {
      jobId: `dispatch-timeout-${dispatchId}`,
      delay: this.delayMs,
      removeOnComplete: 500,
      removeOnFail: 500,
    });
  }

  async onModuleDestroy(): Promise<void> { await this.queue.close(); }
}

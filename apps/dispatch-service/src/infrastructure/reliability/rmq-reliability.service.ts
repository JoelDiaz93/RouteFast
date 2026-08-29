import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext } from '@nestjs/microservices';
import { InboxService, ReliableIntegrationEvent } from './inbox.service';

@Injectable()
export class RmqReliabilityService {
  private readonly logger = new Logger(RmqReliabilityService.name);
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(private readonly inbox: InboxService, config: ConfigService) {
    this.maxRetries = Number(config.get<string>('RMQ_MAX_RETRIES', '3'));
    this.retryDelayMs = Number(config.get<string>('RMQ_RETRY_DELAY_MS', '3000'));
  }

  async handle(
    queue: string,
    eventType: string,
    event: ReliableIntegrationEvent,
    context: RmqContext,
    operation: () => Promise<unknown>,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      await this.inbox.process(eventType, event, operation);
      channel.ack(message);
    } catch (error) {
      const headers = (message.properties?.headers ?? {}) as Record<string, unknown>;
      const retryCount = Number(headers['x-routefast-retry-count'] ?? 0);
      const retryQueue = `${queue}.retry`;
      const dlq = `${queue}.dlq`;

      await channel.assertQueue(retryQueue, {
        durable: true,
        arguments: {
          'x-message-ttl': this.retryDelayMs,
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': queue,
        },
      });
      await channel.assertQueue(dlq, { durable: true });

      if (retryCount < this.maxRetries) {
        channel.sendToQueue(retryQueue, message.content, {
          persistent: true,
          contentType: message.properties?.contentType ?? 'application/json',
          messageId: message.properties?.messageId,
          headers: { ...headers, 'x-routefast-retry-count': retryCount + 1 },
        });
        this.logger.warn(`${eventType} failed; scheduled retry ${retryCount + 1}/${this.maxRetries}`);
      } else {
        channel.sendToQueue(dlq, message.content, {
          persistent: true,
          contentType: message.properties?.contentType ?? 'application/json',
          messageId: message.properties?.messageId,
          headers: { ...headers, 'x-routefast-retry-count': retryCount, 'x-routefast-dead-lettered': true },
        });
        this.logger.error(`${eventType} exhausted retries and was moved to ${dlq}`);
      }

      if (typeof channel.waitForConfirms === 'function') {
        await channel.waitForConfirms();
      }
      // Ack only after the retry/DLQ copy has been handed to RabbitMQ.
      channel.ack(message);
    }
  }
}

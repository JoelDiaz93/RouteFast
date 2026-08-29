import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelWrapper, connect, AmqpConnectionManager } from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';
import { OutboxOrmEntity } from './outbox.orm-entity';

@Injectable()
export class RabbitOutboxTransport implements OnModuleDestroy {
  private readonly connection: AmqpConnectionManager;
  private readonly channel: ChannelWrapper;

  constructor(config: ConfigService) {
    const url = config.get<string>('RABBITMQ_URL', 'amqp://routefast:routefast@localhost:5672');
    this.connection = connect([url]);
    const queues = [
      config.get<string>('ORDER_EVENTS_QUEUE', 'routefast.order.events'),
      config.get<string>('DRIVER_EVENTS_QUEUE', 'routefast.driver.events'),
      config.get<string>('DISPATCH_EVENTS_QUEUE', 'routefast.dispatch.events'),
    ];
    this.channel = this.connection.createChannel({
      json: false,
      setup: async (channel: ConfirmChannel) => {
        await Promise.all(queues.map((queue) => channel.assertQueue(queue, { durable: true })));
      },
    });
  }

  async publish(event: OutboxOrmEntity): Promise<void> {
    const envelope = Buffer.from(JSON.stringify({
      pattern: event.eventType,
      data: event.payload,
    }));

    await this.channel.sendToQueue(event.targetQueue, envelope, {
      persistent: true,
      messageId: event.id,
      contentType: 'application/json',
      headers: {
        'x-correlation-id': event.correlationId,
        'x-routefast-event-id': event.id,
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel.close();
    await this.connection.close();
  }
}

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { OrderEventPublisher } from '../../application/ports/order-event.publisher';
import { Order } from '../../domain/entities/order.aggregate';

@Injectable()
export class RabbitOrderEventPublisher implements OrderEventPublisher, OnModuleDestroy {
  private readonly client: ClientProxy;

  constructor(config: ConfigService) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [config.get<string>('RABBITMQ_URL', 'amqp://routefast:routefast@localhost:5672')],
        queue: config.get<string>('DISPATCH_EVENTS_QUEUE', 'routefast.dispatch.events'),
        queueOptions: { durable: true },
      },
    });
  }

  async readyForDispatch(order: Order, correlationId: string): Promise<void> {
    await lastValueFrom(
      this.client.emit('order.ready_for_dispatch.v1', {
        orderId: order.id,
        priority: order.priority,
        pickup: {
          latitude: order.pickup.coordinates.latitude,
          longitude: order.pickup.coordinates.longitude,
        },
        dropoff: {
          latitude: order.dropoff.coordinates.latitude,
          longitude: order.dropoff.coordinates.longitude,
        },
        correlationId,
      }),
    );
  }

  async onModuleDestroy(): Promise<void> { await this.client.close(); }
}

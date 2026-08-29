import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { DispatchEventPublisher } from '../../application/ports/dispatch-event.publisher';

@Injectable()
export class RabbitDispatchEventPublisher implements DispatchEventPublisher, OnModuleDestroy {
  private readonly orderClient: ClientProxy;
  private readonly driverClient: ClientProxy;

  constructor(config: ConfigService) {
    const url = config.get<string>('RABBITMQ_URL', 'amqp://routefast:routefast@localhost:5672');
    this.orderClient = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: { urls: [url], queue: config.get<string>('ORDER_EVENTS_QUEUE', 'routefast.order.events'), queueOptions: { durable: true } },
    });
    this.driverClient = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: { urls: [url], queue: config.get<string>('DRIVER_EVENTS_QUEUE', 'routefast.driver.events'), queueOptions: { durable: true } },
    });
  }

  dispatchStarted(input: { dispatchId: string; orderId: string; correlationId: string }): Promise<void> {
    return this.emit(this.orderClient, 'dispatch.started.v1', input);
  }
  requestDriverReservation(input: { dispatchId: string; orderId: string; correlationId: string }): Promise<void> {
    return this.emit(this.driverClient, 'driver.reservation_requested.v1', input);
  }
  dispatchAssigned(input: { dispatchId: string; orderId: string; driverId: string; correlationId: string }): Promise<void> {
    return this.emit(this.orderClient, 'dispatch.assigned.v1', input);
  }
  dispatchFailed(input: { dispatchId: string; orderId: string; reason: string; correlationId: string }): Promise<void> {
    return this.emit(this.orderClient, 'dispatch.failed.v1', input);
  }
  async onModuleDestroy(): Promise<void> { await Promise.all([this.orderClient.close(), this.driverClient.close()]); }
  private async emit(client: ClientProxy, pattern: string, payload: unknown): Promise<void> { await lastValueFrom(client.emit(pattern, payload)); }
}

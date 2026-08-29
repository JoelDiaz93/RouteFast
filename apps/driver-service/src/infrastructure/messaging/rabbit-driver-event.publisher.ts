import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { DriverEventPublisher, DriverReservationResult } from '../../application/ports/driver-event.publisher';

@Injectable()
export class RabbitDriverEventPublisher implements DriverEventPublisher, OnModuleDestroy {
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

  reserved(result: DriverReservationResult & { driverId: string }): Promise<void> {
    return this.emit('driver.reserved.v1', result);
  }

  reservationFailed(result: DriverReservationResult & { reason: string }): Promise<void> {
    return this.emit('driver.reservation_failed.v1', result);
  }

  async onModuleDestroy(): Promise<void> { await this.client.close(); }

  private async emit(pattern: string, payload: unknown): Promise<void> {
    await lastValueFrom(this.client.emit(pattern, payload));
  }
}

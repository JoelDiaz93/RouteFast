import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { OrderCreationTransaction } from '../../../application/ports/order-creation.transaction';
import { Order } from '../../../domain/entities/order.aggregate';
import { OutboxOrmEntity, OutboxStatus } from '../../reliability/outbox.orm-entity';
import { OrderMapper } from './order.mapper';
import { OrderOrmEntity } from './order.orm-entity';

@Injectable()
export class TypeOrmOrderCreationTransaction implements OrderCreationTransaction {
  private readonly dispatchQueue: string;

  constructor(private readonly dataSource: DataSource, config: ConfigService) {
    this.dispatchQueue = config.get<string>('DISPATCH_EVENTS_QUEUE', 'routefast.dispatch.events');
  }

  async persistReadyForDispatch(order: Order, correlationId: string, idempotencyKey?: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const orders = manager.getRepository(OrderOrmEntity);
      if (idempotencyKey) {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [idempotencyKey]);
        const existing = await orders.findOne({ where: { idempotencyKey } });
        if (existing) return OrderMapper.toDomain(existing);
      }

      const entity = OrderMapper.toPersistence(order);
      entity.idempotencyKey = idempotencyKey?.trim() || null;
      await orders.save(entity);

      const eventId = randomUUID();
      const outbox = manager.getRepository(OutboxOrmEntity).create({
        id: eventId,
        eventType: 'order.ready_for_dispatch.v1',
        targetQueue: this.dispatchQueue,
        payload: {
          eventId,
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
        },
        status: OutboxStatus.PENDING,
        attempts: 0,
        correlationId,
        availableAt: new Date(),
        publishedAt: null,
      });
      await manager.getRepository(OutboxOrmEntity).save(outbox);
      return order;
    });
  }
}

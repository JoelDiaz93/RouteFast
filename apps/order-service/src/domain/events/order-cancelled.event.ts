import { randomUUID } from 'node:crypto';
import { DomainEvent } from './domain-event';

export class OrderCancelledEvent implements DomainEvent {
  readonly eventId = randomUUID();
  readonly eventName = 'order.cancelled';
  readonly occurredAt = new Date();

  constructor(public readonly aggregateId: string) {}
}

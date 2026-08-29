import { randomUUID } from 'node:crypto';
import { DomainEvent } from './domain-event';

export class OrderCreatedEvent implements DomainEvent {
  readonly eventId = randomUUID();
  readonly eventName = 'order.created';
  readonly occurredAt = new Date();

  constructor(public readonly aggregateId: string) {}
}

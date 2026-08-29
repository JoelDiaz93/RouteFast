export interface DomainEvent {
  readonly eventId: string;
  readonly eventName: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
}

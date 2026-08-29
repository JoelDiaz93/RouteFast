import { DomainEvent } from '../events/domain-event';
import { OrderCancelledEvent } from '../events/order-cancelled.event';
import { OrderCreatedEvent } from '../events/order-created.event';
import { InvalidOrderStateError } from '../errors/invalid-order-state.error';
import { Location } from '../value-objects/location.vo';
import { OrderPriority } from './order-priority.enum';
import { OrderStatus } from './order-status.enum';

export interface OrderProps {
  id: string;
  customerId: string;
  priority: OrderPriority;
  pickup: Location;
  dropoff: Location;
  status: OrderStatus;
  assignedDriverId: string | null;
  lastDispatchFailureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Order {
  private readonly domainEvents: DomainEvent[] = [];
  private constructor(private readonly props: OrderProps) {}

  static create(input: { id: string; customerId: string; priority: OrderPriority; pickup: Location; dropoff: Location; now?: Date }): Order {
    const customerId = input.customerId.trim();
    if (!customerId) throw new Error('customerId is required');
    const now = input.now ?? new Date();
    const order = new Order({
      id: input.id,
      customerId,
      priority: input.priority,
      pickup: input.pickup,
      dropoff: input.dropoff,
      status: OrderStatus.PENDING_DISPATCH,
      assignedDriverId: null,
      lastDispatchFailureReason: null,
      createdAt: now,
      updatedAt: now,
    });
    order.domainEvents.push(new OrderCreatedEvent(input.id));
    return order;
  }

  static rehydrate(props: OrderProps): Order { return new Order(props); }

  beginDispatch(now = new Date()): void {
    if (this.props.status !== OrderStatus.PENDING_DISPATCH) return;
    this.props.status = OrderStatus.DISPATCHING;
    this.props.lastDispatchFailureReason = null;
    this.props.updatedAt = now;
  }

  assignDriver(driverId: string, now = new Date()): void {
    if (this.props.status === OrderStatus.ASSIGNED && this.props.assignedDriverId === driverId) return;
    if (this.props.status !== OrderStatus.DISPATCHING) {
      throw new InvalidOrderStateError(`Order ${this.props.id} cannot be assigned from ${this.props.status}`);
    }
    this.props.assignedDriverId = driverId;
    this.props.status = OrderStatus.ASSIGNED;
    this.props.updatedAt = now;
  }

  dispatchFailed(reason: string, now = new Date()): void {
    if (this.props.status !== OrderStatus.DISPATCHING) return;
    this.props.status = OrderStatus.PENDING_DISPATCH;
    this.props.lastDispatchFailureReason = reason;
    this.props.updatedAt = now;
  }


  cancelAfterDispatch(now = new Date()): void {
    if (this.props.status === OrderStatus.CANCELLED) return;
    if (this.props.status !== OrderStatus.ASSIGNED && this.props.status !== OrderStatus.DISPATCHING) {
      throw new InvalidOrderStateError(`Order ${this.props.id} cannot complete dispatch compensation from ${this.props.status}`);
    }
    this.props.status = OrderStatus.CANCELLED;
    this.props.updatedAt = now;
  }

  cancel(now = new Date()): void {
    if (this.props.status !== OrderStatus.PENDING_DISPATCH) {
      throw new InvalidOrderStateError(`Order ${this.props.id} cannot be cancelled from ${this.props.status}`);
    }
    this.props.status = OrderStatus.CANCELLED;
    this.props.updatedAt = now;
    this.domainEvents.push(new OrderCancelledEvent(this.props.id));
  }

  pullDomainEvents(): DomainEvent[] { return this.domainEvents.splice(0, this.domainEvents.length); }
  get id(): string { return this.props.id; }
  get customerId(): string { return this.props.customerId; }
  get priority(): OrderPriority { return this.props.priority; }
  get pickup(): Location { return this.props.pickup; }
  get dropoff(): Location { return this.props.dropoff; }
  get status(): OrderStatus { return this.props.status; }
  get assignedDriverId(): string | null { return this.props.assignedDriverId; }
  get lastDispatchFailureReason(): string | null { return this.props.lastDispatchFailureReason; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}

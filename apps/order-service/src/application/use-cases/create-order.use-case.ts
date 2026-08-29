import { randomUUID } from 'node:crypto';
import { Order } from '../../domain/entities/order.aggregate';
import { OrderPriority } from '../../domain/entities/order-priority.enum';
import { Location } from '../../domain/value-objects/location.vo';
import { OrderEventPublisher } from '../ports/order-event.publisher';
import { OrderRepository } from '../ports/order.repository';
import { OrderView, toOrderView } from './order.view';

export interface CreateOrderCommand {
  customerId: string;
  priority: OrderPriority;
  correlationId?: string;
  pickup: { label: string; address: string; latitude: number; longitude: number; };
  dropoff: { label: string; address: string; latitude: number; longitude: number; };
}

export class CreateOrderUseCase {
  constructor(
    private readonly repository: OrderRepository,
    private readonly publisher: OrderEventPublisher,
  ) {}

  async execute(command: CreateOrderCommand): Promise<OrderView> {
    const order = Order.create({
      id: randomUUID(),
      customerId: command.customerId,
      priority: command.priority,
      pickup: Location.create(command.pickup),
      dropoff: Location.create(command.dropoff),
    });
    await this.repository.save(order);
    order.pullDomainEvents();

    // Known Phase 2 gap: DB commit and publish are not atomic yet.
    // Phase 3 replaces this direct publication with a Transactional Outbox.
    await this.publisher.readyForDispatch(order, command.correlationId ?? order.id);
    return toOrderView(order);
  }
}

import { randomUUID } from 'node:crypto';
import { Order } from '../../domain/entities/order.aggregate';
import { OrderPriority } from '../../domain/entities/order-priority.enum';
import { Location } from '../../domain/value-objects/location.vo';
import { OrderRepository } from '../ports/order.repository';
import { OrderView, toOrderView } from './order.view';

export interface CreateOrderCommand {
  customerId: string;
  priority: OrderPriority;
  pickup: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  dropoff: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  };
}

export class CreateOrderUseCase {
  constructor(private readonly repository: OrderRepository) {}

  async execute(command: CreateOrderCommand): Promise<OrderView> {
    const order = Order.create({
      id: randomUUID(),
      customerId: command.customerId,
      priority: command.priority,
      pickup: Location.create(command.pickup),
      dropoff: Location.create(command.dropoff),
    });

    await this.repository.save(order);

    // Event publication is intentionally deferred to the Outbox phase.
    order.pullDomainEvents();

    return toOrderView(order);
  }
}

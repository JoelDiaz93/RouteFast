import { randomUUID } from 'node:crypto';
import { Order } from '../../domain/entities/order.aggregate';
import { OrderPriority } from '../../domain/entities/order-priority.enum';
import { Location } from '../../domain/value-objects/location.vo';
import { OrderCreationTransaction } from '../ports/order-creation.transaction';
import { OrderView, toOrderView } from './order.view';

export interface CreateOrderCommand {
  customerId: string;
  priority: OrderPriority;
  correlationId?: string;
  idempotencyKey?: string;
  pickup: { label: string; address: string; latitude: number; longitude: number; };
  dropoff: { label: string; address: string; latitude: number; longitude: number; };
}

export class CreateOrderUseCase {
  constructor(private readonly transaction: OrderCreationTransaction) {}

  async execute(command: CreateOrderCommand): Promise<OrderView> {
    const order = Order.create({
      id: randomUUID(),
      customerId: command.customerId,
      priority: command.priority,
      pickup: Location.create(command.pickup),
      dropoff: Location.create(command.dropoff),
    });
    order.pullDomainEvents();

    const persisted = await this.transaction.persistReadyForDispatch(
      order,
      command.correlationId ?? order.id,
      command.idempotencyKey,
    );
    return toOrderView(persisted);
  }
}

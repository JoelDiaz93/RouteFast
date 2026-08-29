import { OrderNotFoundError } from '../errors/order-not-found.error';
import { OrderRepository } from '../ports/order.repository';
import { OrderView, toOrderView } from './order.view';

export class GetOrderUseCase {
  constructor(private readonly repository: OrderRepository) {}

  async execute(orderId: string): Promise<OrderView> {
    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }
    return toOrderView(order);
  }
}

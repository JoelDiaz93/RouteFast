import { OrderRepository } from '../ports/order.repository';
import { OrderView, toOrderView } from './order.view';

export class ListOrdersUseCase {
  constructor(private readonly repository: OrderRepository) {}

  async execute(limit = 100): Promise<OrderView[]> {
    const orders = await this.repository.findAll(limit);
    return orders.map(toOrderView);
  }
}

import { OrderRepository } from '../ports/order.repository';
import { OrderView, toOrderView } from './order.view';

export class ListOrdersUseCase {
  constructor(private readonly repository: OrderRepository) {}

  async execute(): Promise<OrderView[]> {
    const orders = await this.repository.findAll();
    return orders.map(toOrderView);
  }
}

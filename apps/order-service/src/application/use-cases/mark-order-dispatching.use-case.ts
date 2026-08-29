import { OrderRepository } from '../ports/order.repository';
export class MarkOrderDispatchingUseCase {
  constructor(private readonly repository: OrderRepository) {}
  async execute(orderId: string): Promise<void> {
    const order = await this.repository.findById(orderId);
    if (!order) return;
    order.beginDispatch();
    await this.repository.save(order);
  }
}

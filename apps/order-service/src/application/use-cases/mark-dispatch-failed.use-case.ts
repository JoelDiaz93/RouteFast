import { OrderRepository } from '../ports/order.repository';
export class MarkDispatchFailedUseCase {
  constructor(private readonly repository: OrderRepository) {}
  async execute(orderId: string, reason: string): Promise<void> {
    const order = await this.repository.findById(orderId);
    if (!order) return;
    order.dispatchFailed(reason);
    await this.repository.save(order);
  }
}

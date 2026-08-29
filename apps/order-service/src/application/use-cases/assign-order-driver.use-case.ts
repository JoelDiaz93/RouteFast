import { OrderRepository } from '../ports/order.repository';
export class AssignOrderDriverUseCase {
  constructor(private readonly repository: OrderRepository) {}
  async execute(orderId: string, driverId: string): Promise<void> {
    const order = await this.repository.findById(orderId);
    if (!order) return;
    order.assignDriver(driverId);
    await this.repository.save(order);
  }
}

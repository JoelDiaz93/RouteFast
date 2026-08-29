import { OrderRepository } from '../../ports/order.repository';
import { Order } from '../../../domain/entities/order.aggregate';
import { OrderPriority } from '../../../domain/entities/order-priority.enum';
import { CreateOrderUseCase } from '../create-order.use-case';

class InMemoryOrderRepository implements OrderRepository {
  readonly orders: Order[] = [];

  async save(order: Order): Promise<void> {
    const index = this.orders.findIndex((item) => item.id === order.id);
    if (index >= 0) {
      this.orders[index] = order;
    } else {
      this.orders.push(order);
    }
  }

  async findById(orderId: string): Promise<Order | null> {
    return this.orders.find((order) => order.id === orderId) ?? null;
  }

  async findAll(): Promise<Order[]> {
    return [...this.orders];
  }
}

describe('CreateOrderUseCase', () => {
  it('persists and returns a pending order', async () => {
    const repository = new InMemoryOrderRepository();
    const useCase = new CreateOrderUseCase(repository);

    const result = await useCase.execute({
      customerId: 'CUS-1001',
      priority: OrderPriority.STANDARD,
      pickup: {
        label: 'Warehouse',
        address: 'North Ave 10',
        latitude: -0.16,
        longitude: -78.47,
      },
      dropoff: {
        label: 'Customer',
        address: 'South Ave 20',
        latitude: -0.19,
        longitude: -78.49,
      },
    });

    expect(repository.orders).toHaveLength(1);
    expect(result.customerId).toBe('CUS-1001');
    expect(result.status).toBe('PENDING_DISPATCH');
    expect(result.id).toBeTruthy();
  });
});

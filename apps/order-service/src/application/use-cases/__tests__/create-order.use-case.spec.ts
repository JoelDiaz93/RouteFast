import { Order } from '../../../domain/entities/order.aggregate';
import { OrderPriority } from '../../../domain/entities/order-priority.enum';
import { OrderCreationTransaction } from '../../ports/order-creation.transaction';
import { CreateOrderUseCase } from '../create-order.use-case';

class InMemoryOrderCreationTransaction implements OrderCreationTransaction {
  readonly orders: Order[] = [];
  readonly correlations: string[] = [];
  readonly idempotencyKeys: Array<string | undefined> = [];

  async persistReadyForDispatch(order: Order, correlationId: string, idempotencyKey?: string): Promise<Order> {
    this.orders.push(order);
    this.correlations.push(correlationId);
    this.idempotencyKeys.push(idempotencyKey);
    return order;
  }
}

describe('CreateOrderUseCase', () => {
  it('persists order and integration event atomically through the transaction port', async () => {
    const transaction = new InMemoryOrderCreationTransaction();
    const useCase = new CreateOrderUseCase(transaction);
    const result = await useCase.execute({
      customerId: 'CUS-1001',
      priority: OrderPriority.STANDARD,
      correlationId: 'corr-1',
      idempotencyKey: 'create-order-001',
      pickup: { label: 'Warehouse', address: 'North Ave 10', latitude: -0.16, longitude: -78.47 },
      dropoff: { label: 'Customer', address: 'South Ave 20', latitude: -0.19, longitude: -78.49 },
    });

    expect(transaction.orders).toHaveLength(1);
    expect(transaction.correlations).toEqual(['corr-1']);
    expect(transaction.idempotencyKeys).toEqual(['create-order-001']);
    expect(result.status).toBe('PENDING_DISPATCH');
  });
});

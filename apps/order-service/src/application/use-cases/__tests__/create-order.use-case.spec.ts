import { Order } from '../../../domain/entities/order.aggregate';
import { OrderPriority } from '../../../domain/entities/order-priority.enum';
import { OrderEventPublisher } from '../../ports/order-event.publisher';
import { OrderRepository } from '../../ports/order.repository';
import { CreateOrderUseCase } from '../create-order.use-case';
class InMemoryOrderRepository implements OrderRepository {
  readonly orders: Order[] = [];
  async save(order: Order): Promise<void> { const i=this.orders.findIndex(x=>x.id===order.id); i>=0 ? this.orders[i]=order : this.orders.push(order); }
  async findById(orderId: string): Promise<Order | null> { return this.orders.find(x=>x.id===orderId) ?? null; }
  async findAll(): Promise<Order[]> { return [...this.orders]; }
}
class SpyPublisher implements OrderEventPublisher {
  readonly published: string[] = [];
  async readyForDispatch(order: Order): Promise<void> { this.published.push(order.id); }
}
describe('CreateOrderUseCase', () => {
  it('persists the order and emits the dispatch integration event', async () => {
    const repository = new InMemoryOrderRepository(); const publisher = new SpyPublisher();
    const useCase = new CreateOrderUseCase(repository, publisher);
    const result = await useCase.execute({
      customerId:'CUS-1001', priority:OrderPriority.STANDARD, correlationId:'corr-1',
      pickup:{label:'Warehouse',address:'North Ave 10',latitude:-0.16,longitude:-78.47},
      dropoff:{label:'Customer',address:'South Ave 20',latitude:-0.19,longitude:-78.49},
    });
    expect(repository.orders).toHaveLength(1); expect(result.status).toBe('PENDING_DISPATCH'); expect(publisher.published).toEqual([result.id]);
  });
});

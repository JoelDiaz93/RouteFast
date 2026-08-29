import { Order } from '../order.aggregate';
import { OrderPriority } from '../order-priority.enum';
import { OrderStatus } from '../order-status.enum';
import { InvalidOrderStateError } from '../../errors/invalid-order-state.error';
import { Location } from '../../value-objects/location.vo';

const pickup = Location.create({
  label: 'Warehouse',
  address: 'North Ave 10',
  latitude: -0.16,
  longitude: -78.47,
});

const dropoff = Location.create({
  label: 'Customer',
  address: 'South Ave 20',
  latitude: -0.19,
  longitude: -78.49,
});

describe('Order aggregate', () => {
  it('creates an order pending dispatch and records a domain event', () => {
    const order = Order.create({
      id: '11111111-1111-1111-1111-111111111111',
      customerId: 'CUS-1',
      priority: OrderPriority.EXPRESS,
      pickup,
      dropoff,
      now: new Date('2026-08-29T00:00:00.000Z'),
    });

    expect(order.status).toBe(OrderStatus.PENDING_DISPATCH);
    expect(order.pullDomainEvents()).toEqual([
      expect.objectContaining({
        eventName: 'order.created',
        aggregateId: order.id,
      }),
    ]);
  });

  it('cancels a pending order', () => {
    const order = Order.create({
      id: '22222222-2222-2222-2222-222222222222',
      customerId: 'CUS-2',
      priority: OrderPriority.STANDARD,
      pickup,
      dropoff,
    });
    order.pullDomainEvents();

    order.cancel(new Date('2026-08-29T01:00:00.000Z'));

    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(order.pullDomainEvents()[0]).toEqual(
      expect.objectContaining({ eventName: 'order.cancelled' }),
    );
  });

  it('rejects cancellation from a non-pending state', () => {
    const order = Order.rehydrate({
      id: '33333333-3333-3333-3333-333333333333',
      customerId: 'CUS-3',
      priority: OrderPriority.STANDARD,
      pickup,
      dropoff,
      status: OrderStatus.ASSIGNED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(() => order.cancel()).toThrow(InvalidOrderStateError);
  });
});

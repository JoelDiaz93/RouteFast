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


  it('moves through dispatching to assigned with a driver', () => {
    const order = Order.create({
      id: '99999999-9999-9999-9999-999999999999',
      customerId: 'CUS-9',
      priority: OrderPriority.EXPRESS,
      pickup,
      dropoff,
    });
    order.beginDispatch();
    expect(order.status).toBe(OrderStatus.DISPATCHING);
    order.assignDriver('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(order.status).toBe(OrderStatus.ASSIGNED);
    expect(order.assignedDriverId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  });

  it('returns to pending when dispatch fails', () => {
    const order = Order.create({
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      customerId: 'CUS-10',
      priority: OrderPriority.STANDARD,
      pickup,
      dropoff,
    });
    order.beginDispatch();
    order.dispatchFailed('NO_AVAILABLE_DRIVER');
    expect(order.status).toBe(OrderStatus.PENDING_DISPATCH);
    expect(order.lastDispatchFailureReason).toBe('NO_AVAILABLE_DRIVER');
  });

  it('rejects cancellation from a non-pending state', () => {
    const order = Order.rehydrate({
      id: '33333333-3333-3333-3333-333333333333',
      customerId: 'CUS-3',
      priority: OrderPriority.STANDARD,
      pickup,
      dropoff,
      status: OrderStatus.ASSIGNED,
      assignedDriverId: '44444444-4444-4444-4444-444444444444',
      lastDispatchFailureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(() => order.cancel()).toThrow(InvalidOrderStateError);
  });
});

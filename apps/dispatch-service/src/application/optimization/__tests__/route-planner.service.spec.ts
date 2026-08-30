import { RoutePlannerService } from '../route-planner.service';

describe('RoutePlannerService', () => {
  const planner = new RoutePlannerService();

  it('keeps pickup before dropoff and never exceeds vehicle capacity', () => {
    const result = planner.plan({
      origin: { latitude: -0.1807, longitude: -78.4678 },
      vehicleCapacity: 2,
      orders: [
        { orderId: 'A', demand: 1, pickup: { latitude: -0.17, longitude: -78.47 }, dropoff: { latitude: -0.19, longitude: -78.49 } },
        { orderId: 'B', demand: 1, pickup: { latitude: -0.175, longitude: -78.465 }, dropoff: { latitude: -0.185, longitude: -78.48 } },
      ],
    });

    for (const id of ['A', 'B']) {
      expect(result.stops.findIndex((stop) => stop.orderId === id && stop.type === 'PICKUP'))
        .toBeLessThan(result.stops.findIndex((stop) => stop.orderId === id && stop.type === 'DROPOFF'));
    }
    expect(Math.max(...result.stops.map((stop) => stop.loadAfter))).toBeLessThanOrEqual(2);
    expect(result.stops.at(-1)?.loadAfter).toBe(0);
  });

  it('rejects an order whose demand exceeds vehicle capacity', () => {
    const result = planner.plan({
      origin: { latitude: 0, longitude: 0 },
      vehicleCapacity: 2,
      orders: [{ orderId: 'oversize', demand: 3, pickup: { latitude: 0.01, longitude: 0 }, dropoff: { latitude: 0.02, longitude: 0 } }],
    });
    expect(result.rejectedOrderIds).toEqual(['oversize']);
    expect(result.stops).toHaveLength(0);
  });
  it('rejects duplicate order identifiers', () => {
    expect(() => planner.plan({
      origin: { latitude: 0, longitude: 0 },
      vehicleCapacity: 2,
      orders: [
        { orderId: 'same', demand: 1, pickup: { latitude: 0.01, longitude: 0 }, dropoff: { latitude: 0.02, longitude: 0 } },
        { orderId: 'same', demand: 1, pickup: { latitude: 0.03, longitude: 0 }, dropoff: { latitude: 0.04, longitude: 0 } },
      ],
    })).toThrow('duplicate orderId');
  });

});

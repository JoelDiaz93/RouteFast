export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RoutePlanOrder {
  orderId: string;
  demand: number;
  pickup: RoutePoint;
  dropoff: RoutePoint;
}

export interface RoutePlanInput {
  origin: RoutePoint;
  vehicleCapacity: number;
  orders: RoutePlanOrder[];
}

export interface PlannedStop extends RoutePoint {
  sequence: number;
  orderId: string;
  type: 'PICKUP' | 'DROPOFF';
  demand: number;
  loadAfter: number;
  legDistanceKm: number;
}

export interface RoutePlanResult {
  strategyVersion: 'paired-insertion-v1';
  totalDistanceKm: number;
  sequentialDistanceKm: number;
  estimatedDistanceSavingsPct: number;
  stops: PlannedStop[];
  rejectedOrderIds: string[];
}

interface InternalStop extends RoutePoint {
  orderId: string;
  type: 'PICKUP' | 'DROPOFF';
  demand: number;
}

/**
 * Deterministic pickup-and-delivery insertion heuristic.
 *
 * This is deliberately not presented as an optimal VRP solver. It provides a bounded,
 * explainable baseline that respects pickup-before-dropoff and vehicle-capacity invariants.
 */
export class RoutePlannerService {
  plan(input: RoutePlanInput): RoutePlanResult {
    assertPoint(input.origin, 'origin');
    if (!Number.isInteger(input.vehicleCapacity) || input.vehicleCapacity < 1) {
      throw new Error('vehicleCapacity must be a positive integer');
    }
    if (input.orders.length < 1 || input.orders.length > 25) {
      throw new Error('orders must contain between 1 and 25 items');
    }

    const seenOrderIds = new Set<string>();
    for (const order of input.orders) {
      if (!order.orderId.trim()) throw new Error('orderId is required');
      if (seenOrderIds.has(order.orderId)) throw new Error(`duplicate orderId: ${order.orderId}`);
      seenOrderIds.add(order.orderId);
      assertPoint(order.pickup, `pickup:${order.orderId}`);
      assertPoint(order.dropoff, `dropoff:${order.orderId}`);
    }

    let route: InternalStop[] = [];
    const accepted: RoutePlanOrder[] = [];
    const rejectedOrderIds: string[] = [];

    for (const order of input.orders) {
      if (!Number.isInteger(order.demand) || order.demand < 1 || order.demand > input.vehicleCapacity) {
        rejectedOrderIds.push(order.orderId);
        continue;
      }

      const best = this.bestInsertion(input.origin, route, order, input.vehicleCapacity);
      if (!best) {
        rejectedOrderIds.push(order.orderId);
        continue;
      }
      route = best;
      accepted.push(order);
    }

    const totalDistanceKm = this.distanceOf(input.origin, route);
    const sequentialRoute = accepted.flatMap<InternalStop>((order) => [
      { ...order.pickup, orderId: order.orderId, type: 'PICKUP', demand: order.demand },
      { ...order.dropoff, orderId: order.orderId, type: 'DROPOFF', demand: order.demand },
    ]);
    const sequentialDistanceKm = this.distanceOf(input.origin, sequentialRoute);
    const savings = sequentialDistanceKm <= 0 ? 0 : Math.max(0, (1 - totalDistanceKm / sequentialDistanceKm) * 100);

    return {
      strategyVersion: 'paired-insertion-v1',
      totalDistanceKm: round(totalDistanceKm),
      sequentialDistanceKm: round(sequentialDistanceKm),
      estimatedDistanceSavingsPct: round(savings),
      stops: this.materialize(input.origin, route),
      rejectedOrderIds,
    };
  }

  private bestInsertion(
    origin: RoutePoint,
    route: InternalStop[],
    order: RoutePlanOrder,
    capacity: number,
  ): InternalStop[] | null {
    const pickup: InternalStop = { ...order.pickup, orderId: order.orderId, type: 'PICKUP', demand: order.demand };
    const dropoff: InternalStop = { ...order.dropoff, orderId: order.orderId, type: 'DROPOFF', demand: order.demand };
    let best: InternalStop[] | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let pickupIndex = 0; pickupIndex <= route.length; pickupIndex += 1) {
      const withPickup = [...route.slice(0, pickupIndex), pickup, ...route.slice(pickupIndex)];
      for (let dropoffIndex = pickupIndex + 1; dropoffIndex <= withPickup.length; dropoffIndex += 1) {
        const candidate = [...withPickup.slice(0, dropoffIndex), dropoff, ...withPickup.slice(dropoffIndex)];
        if (!this.isCapacityFeasible(candidate, capacity)) continue;
        const distance = this.distanceOf(origin, candidate);
        if (distance < bestDistance) {
          best = candidate;
          bestDistance = distance;
        }
      }
    }
    return best;
  }

  private isCapacityFeasible(stops: InternalStop[], capacity: number): boolean {
    let load = 0;
    const picked = new Set<string>();
    for (const stop of stops) {
      if (stop.type === 'PICKUP') {
        if (picked.has(stop.orderId)) return false;
        picked.add(stop.orderId);
        load += stop.demand;
      } else {
        if (!picked.has(stop.orderId)) return false;
        load -= stop.demand;
      }
      if (load < 0 || load > capacity) return false;
    }
    return load === 0;
  }

  private materialize(origin: RoutePoint, route: InternalStop[]): PlannedStop[] {
    let previous = origin;
    let load = 0;
    return route.map((stop, index) => {
      load += stop.type === 'PICKUP' ? stop.demand : -stop.demand;
      const legDistanceKm = haversineKm(previous, stop);
      previous = stop;
      return {
        ...stop,
        sequence: index + 1,
        loadAfter: load,
        legDistanceKm: round(legDistanceKm),
      };
    });
  }

  private distanceOf(origin: RoutePoint, stops: InternalStop[]): number {
    let previous = origin;
    let total = 0;
    for (const stop of stops) {
      total += haversineKm(previous, stop);
      previous = stop;
    }
    return total;
  }
}

function assertPoint(point: RoutePoint, label: string): void {
  if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90) {
    throw new Error(`${label}.latitude must be between -90 and 90`);
  }
  if (!Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
    throw new Error(`${label}.longitude must be between -180 and 180`);
  }
}

function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const earthRadiusKm = 6371.0088;
  const toRadians = (value: number): number => value * Math.PI / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function round(value: number): number { return Number(value.toFixed(3)); }

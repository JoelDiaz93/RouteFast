import type {
  Dispatch,
  DispatchDecision,
  Driver,
  DriverLocation,
  EtaResult,
  HealthResponse,
  LocationUpdateResult,
  NearbyDriver,
  Order,
  OrderPriority,
  RequestTrace,
  RoutePlanOrder,
  RoutePlanResult,
} from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

let onTrace: ((trace: RequestTrace) => void) | null = null;

export function registerTraceListener(listener: (trace: RequestTrace) => void): () => void {
  onTrace = listener;
  return () => {
    if (onTrace === listener) onTrace = null;
  };
}

function correlationId(): string {
  return crypto.randomUUID();
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const started = performance.now();
  const requestCorrelationId = correlationId();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': requestCorrelationId,
        ...extraHeaders,
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    onTrace?.({
      method: init.method ?? 'GET',
      path,
      status: 0,
      durationMs: performance.now() - started,
      correlationId: requestCorrelationId,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try { payload = JSON.parse(raw); }
    catch { payload = raw; }
  }

  onTrace?.({
    method: init.method ?? 'GET',
    path,
    status: response.status,
    durationMs: performance.now() - started,
    correlationId: response.headers.get('x-correlation-id') ?? requestCorrelationId,
    timestamp: new Date().toISOString(),
  });

  if (!response.ok) {
    const detail = typeof payload === 'object' && payload !== null && 'message' in payload
      ? String((payload as { message?: unknown }).message)
      : typeof payload === 'string' ? payload : `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return payload as T;
}

export const api = {
  health: () => request<HealthResponse>('/health/ready'),

  listOrders: (limit = 100) => request<Order[]>(`/orders?limit=${limit}`),
  getOrder: (id: string) => request<Order>(`/orders/${encodeURIComponent(id)}`),
  createOrder: (input: {
    customerId: string;
    priority: OrderPriority;
    pickup: { label: string; address: string; latitude: number; longitude: number };
    dropoff: { label: string; address: string; latitude: number; longitude: number };
  }, idempotencyKey = crypto.randomUUID()) => request<Order>(
    '/orders',
    { method: 'POST', body: JSON.stringify(input) },
    { 'idempotency-key': idempotencyKey },
  ),
  cancelOrder: (id: string) => request<Order>(`/orders/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' }),

  listDrivers: (limit = 100) => request<Driver[]>(`/drivers?limit=${limit}`),
  createDriver: (input: { displayName: string; capacity: number }) => request<Driver>(
    '/drivers',
    { method: 'POST', body: JSON.stringify(input) },
  ),
  setDriverAvailability: (id: string, status: 'AVAILABLE' | 'OFFLINE') => request<Driver>(
    `/drivers/${encodeURIComponent(id)}/availability`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  ),

  listDispatches: (limit = 100) => request<Dispatch[]>(`/dispatches?limit=${limit}`),
  getDispatchDecision: (id: string) => request<DispatchDecision>(`/dispatches/${encodeURIComponent(id)}/decision`),
  cancelDispatch: (id: string, reason = 'OPS_CONSOLE_CANCELLED') => request<{ dispatchId: string; status: string }>(
    `/dispatches/${encodeURIComponent(id)}/cancel`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  ),

  updateLocation: (input: {
    driverId: string;
    latitude: number;
    longitude: number;
    speedKph?: number;
    headingDegrees?: number;
    recordedAt?: string;
  }) => request<LocationUpdateResult>('/tracking/locations', { method: 'POST', body: JSON.stringify(input) }),
  latestLocation: (driverId: string) => request<DriverLocation>(`/tracking/drivers/${encodeURIComponent(driverId)}/latest`),
  locationHistory: (driverId: string, limit = 25) => request<DriverLocation[]>(
    `/tracking/drivers/${encodeURIComponent(driverId)}/history?limit=${limit}`,
  ),
  nearbyDrivers: (input: {
    latitude: number;
    longitude: number;
    radiusKm: number;
    limit: number;
    candidateDriverIds?: string[];
    maxAgeSeconds?: number;
  }) => request<NearbyDriver[]>('/tracking/nearby', { method: 'POST', body: JSON.stringify(input) }),
  eta: (input: { driverId: string; latitude: number; longitude: number }) => request<EtaResult>(
    '/tracking/eta',
    { method: 'POST', body: JSON.stringify(input) },
  ),

  routePlan: (input: {
    origin: { latitude: number; longitude: number };
    vehicleCapacity: number;
    orders: RoutePlanOrder[];
  }) => request<RoutePlanResult>('/optimization/route-plan', { method: 'POST', body: JSON.stringify(input) }),
};

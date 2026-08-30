import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';
import { requireGatewayReady } from './lib/preflight.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

// Progressive ingestion stress profile. Each service sees four steady-state levels:
//   total target ≈ 50/s → 100/s → 200/s → 400/s.
// The test is intentionally not a capacity claim. It is a saturation finder.
const orderStages = [
  { target: 10, duration: '15s' }, { target: 10, duration: '45s' },
  { target: 20, duration: '15s' }, { target: 20, duration: '45s' },
  { target: 40, duration: '15s' }, { target: 40, duration: '45s' },
  { target: 80, duration: '15s' }, { target: 80, duration: '45s' },
];

const trackingStages = [
  { target: 40, duration: '15s' }, { target: 40, duration: '45s' },
  { target: 80, duration: '15s' }, { target: 80, duration: '45s' },
  { target: 160, duration: '15s' }, { target: 160, duration: '45s' },
  { target: 320, duration: '15s' }, { target: 320, duration: '45s' },
];

export const options = {
  scenarios: {
    orders: {
      executor: 'ramping-arrival-rate',
      exec: 'createOrder',
      startRate: 8,
      timeUnit: '1s',
      preAllocatedVUs: 30,
      maxVUs: 120,
      stages: orderStages,
      gracefulStop: '30s',
      tags: { workload: 'stress', plane: 'orders' },
    },
    tracking: {
      executor: 'ramping-arrival-rate',
      exec: 'updateLocation',
      startRate: 30,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: trackingStages,
      gracefulStop: '30s',
      tags: { workload: 'stress', plane: 'tracking' },
    },
  },
  thresholds: {
    // Guardrails, not production SLOs. Crossing them is evidence to investigate.
    http_req_failed: ['rate<0.05'],
    'http_req_duration{scenario:orders}': ['p(95)<1000'],
    'http_req_duration{scenario:tracking}': ['p(95)<500'],
  },
};

export function setup() {
  requireGatewayReady(BASE_URL);

  const correlationId = `k6-stress-setup-${Date.now()}`;
  const driver = http.post(
    `${BASE_URL}/drivers`,
    JSON.stringify({ displayName: 'K6 Stress Tracking Driver', capacity: 20 }),
    { headers: { 'Content-Type': 'application/json', 'x-correlation-id': correlationId } },
  );

  if (driver.status < 200 || driver.status >= 300) {
    throw new Error(`Cannot create stress-test tracking driver: ${driver.status}`);
  }

  return { driverId: driver.json('id') };
}

export function createOrder() {
  const n = exec.scenario.iterationInTest;
  const key = `k6-stress-order-${n}-${Date.now()}`;
  const response = http.post(
    `${BASE_URL}/orders`,
    JSON.stringify({
      customerId: key,
      priority: n % 10 === 0 ? 'EXPRESS' : 'STANDARD',
      pickup: {
        label: 'Stress Warehouse', address: 'Quito North',
        latitude: -0.1600, longitude: -78.4700,
      },
      dropoff: {
        label: 'Stress Customer', address: 'Quito Center',
        latitude: -0.1900, longitude: -78.4900,
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        'x-correlation-id': key,
      },
      tags: { name: 'POST /orders' },
    },
  );

  check(response, { 'stress order accepted': (r) => r.status >= 200 && r.status < 300 });
}

export function updateLocation(data) {
  const n = exec.scenario.iterationInTest;
  const response = http.post(
    `${BASE_URL}/tracking/locations`,
    JSON.stringify({
      driverId: data.driverId,
      latitude: -0.1605 + ((n % 50) * 0.000005),
      longitude: -78.4695 + ((n % 50) * 0.000005),
      speedKph: 25 + (n % 15),
      headingDegrees: 180 + (n % 30),
      recordedAt: new Date().toISOString(),
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': `k6-stress-gps-${n}`,
      },
      tags: { name: 'POST /tracking/locations' },
    },
  );

  check(response, { 'stress GPS accepted': (r) => r.status >= 200 && r.status < 300 });
}

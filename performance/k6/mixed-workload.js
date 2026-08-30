import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';
import { requireGatewayReady } from './lib/preflight.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  scenarios: {
    orders: {
      executor: 'constant-arrival-rate', exec: 'createOrder', rate: 8, timeUnit: '1s',
      duration: '60s', preAllocatedVUs: 10, maxVUs: 40,
    },
    tracking: {
      executor: 'constant-arrival-rate', exec: 'updateLocation', rate: 30, timeUnit: '1s',
      duration: '60s', preAllocatedVUs: 10, maxVUs: 50,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{scenario:orders}': ['p(95)<600'],
    'http_req_duration{scenario:tracking}': ['p(95)<250'],
  },
};

export function setup() {
  requireGatewayReady(BASE_URL);

  const correlationId = `k6-setup-${Date.now()}`;
  const response = http.post(`${BASE_URL}/drivers`, JSON.stringify({ displayName: 'K6 Driver', capacity: 20 }), {
    headers: { 'Content-Type': 'application/json', 'x-correlation-id': correlationId },
  });
  if (response.status < 200 || response.status >= 300) throw new Error(`Cannot create load-test driver: ${response.status}`);
  return { driverId: response.json('id') };
}

export function createOrder() {
  const key = `k6-order-${exec.scenario.iterationInTest}-${Date.now()}`;
  const response = http.post(`${BASE_URL}/orders`, JSON.stringify({
    customerId: key,
    priority: exec.scenario.iterationInTest % 5 === 0 ? 'EXPRESS' : 'STANDARD',
    pickup: { label: 'Warehouse', address: 'Quito North', latitude: -0.1600, longitude: -78.4700 },
    dropoff: { label: 'Customer', address: 'Quito Center', latitude: -0.1900, longitude: -78.4900 },
  }), { headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, 'x-correlation-id': key } });
  check(response, { 'order accepted': (r) => r.status >= 200 && r.status < 300 });
}

export function updateLocation(data) {
  const n = exec.scenario.iterationInTest;
  const response = http.post(`${BASE_URL}/tracking/locations`, JSON.stringify({
    driverId: data.driverId,
    latitude: -0.1605 + ((n % 20) * 0.00001),
    longitude: -78.4695 + ((n % 20) * 0.00001),
    speedKph: 25,
    headingDegrees: 190,
    recordedAt: new Date().toISOString(),
  }), { headers: { 'Content-Type': 'application/json', 'x-correlation-id': `k6-gps-${n}` } });
  check(response, { 'GPS accepted': (r) => r.status >= 200 && r.status < 300 });
}

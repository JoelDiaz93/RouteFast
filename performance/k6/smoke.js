import http from 'k6/http';
import { check, sleep } from 'k6';
import { requireGatewayReady } from './lib/preflight.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
};

export function setup() {
  requireGatewayReady(BASE_URL);
}

export default function () {
  const key = `k6-smoke-${__VU}-${__ITER}-${Date.now()}`;
  const payload = JSON.stringify({
    customerId: `K6-${__VU}-${__ITER}`,
    priority: 'STANDARD',
    pickup: { label: 'Warehouse', address: 'Quito North', latitude: -0.1600, longitude: -78.4700 },
    dropoff: { label: 'Customer', address: 'Quito Center', latitude: -0.1900, longitude: -78.4900 },
  });
  const response = http.post(`${BASE_URL}/orders`, payload, {
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, 'x-correlation-id': key },
  });
  check(response, { 'order accepted': (r) => r.status >= 200 && r.status < 300 });
  sleep(0.25);
}

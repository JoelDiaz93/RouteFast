import http from 'k6/http';
import { check } from 'k6';
import { requireGatewayReady } from './lib/preflight.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  vus: 5,
  iterations: 25,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750'],
  },
};

export function setup() {
  requireGatewayReady(BASE_URL);
}

export default function () {
  const key = `k6-idempotency-${__VU}-${__ITER}`;
  const body = JSON.stringify({
    customerId: `IDEMP-${__VU}-${__ITER}`,
    priority: 'STANDARD',
    pickup: { label: 'A', address: 'Origin', latitude: -0.1600, longitude: -78.4700 },
    dropoff: { label: 'B', address: 'Destination', latitude: -0.1900, longitude: -78.4900 },
  });
  const params = { headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, 'x-correlation-id': key } };
  const responses = http.batch(Array.from({ length: 5 }, () => ['POST', `${BASE_URL}/orders`, body, params]));
  const ids = responses.map((response) => {
    try { return response.json('id'); } catch (_) { return null; }
  }).filter(Boolean);
  check(responses, {
    'all duplicate requests succeeded': (items) => items.every((r) => r.status >= 200 && r.status < 300),
    'same business result returned': () => ids.length > 0 && new Set(ids).size === 1,
  });
}

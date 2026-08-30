# Phase 6 manual validation

## Quality gate

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Route optimizer

```http
POST http://localhost:3000/api/v1/optimization/route-plan
Content-Type: application/json
x-correlation-id: phase6-route-plan

{
  "origin": { "latitude": -0.1807, "longitude": -78.4678 },
  "vehicleCapacity": 2,
  "orders": [
    {
      "orderId": "ORD-A",
      "demand": 1,
      "pickup": { "latitude": -0.1700, "longitude": -78.4700 },
      "dropoff": { "latitude": -0.1900, "longitude": -78.4900 }
    },
    {
      "orderId": "ORD-B",
      "demand": 1,
      "pickup": { "latitude": -0.1750, "longitude": -78.4650 },
      "dropoff": { "latitude": -0.1850, "longitude": -78.4800 }
    }
  ]
}
```

Verify pickup-before-dropoff, `loadAfter <= vehicleCapacity`, final load `0`, and `strategyVersion=paired-insertion-v1`.

## Circuit breaker

1. Start all services.
2. Stop Tracking Service only.
3. Create geo-aware orders until the configured dependency failure threshold is reached.
4. Inspect `http://localhost:3003/metrics` for `routefast_circuit_breaker_state`.
5. Restart Tracking and wait for `CIRCUIT_BREAKER_RESET_TIMEOUT_MS`.
6. Submit another workflow and verify the breaker returns to CLOSED after a successful half-open probe.

## Load

```bash
npm run load:smoke
npm run load:idempotency
npm run load:mixed
```

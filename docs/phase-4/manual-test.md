# Phase 4 Manual Test

## 1. Infrastructure

```bash
docker compose up -d
```

Expected containers include:

- Order PostgreSQL
- Driver PostgreSQL
- Dispatch PostgreSQL
- Tracking PostGIS
- RabbitMQ
- Redis

## 2. Start applications

```bash
npm run start:order
npm run start:driver
npm run start:dispatch
npm run start:tracking
npm run start:gateway
```

## 3. Create a driver

Use `routefast.http` and copy the returned driver UUID.

## 4. Send GPS positions

REST fallback:

```http
POST /api/v1/tracking/locations
```

or WebSocket demo:

```bash
npm run demo:tracking -- <driverId>
```

## 5. Verify geo lookup

```http
POST /api/v1/tracking/nearby
```

The driver should appear with `distanceKm` and `ageSeconds`.

## 6. Create an order near the driver

The order emits `order.ready_for_dispatch.v1`. Dispatch then:

1. loads available capacity candidates from Driver Service;
2. asks Tracking Service for fresh nearby members;
3. computes score ranking;
4. persists `dispatch_decisions`;
5. emits `driver.reservation_requested.v1` with ranked IDs.

## 7. Inspect decision

```http
GET /api/v1/dispatches/<dispatchId>/decision
```

Verify `strategyVersion = geo-score-v1` and inspect components, ETA and SLA risk.

## 8. Durable history

After BullMQ persistence completes:

```http
GET /api/v1/tracking/drivers/<driverId>/history?limit=20
```

## 9. Negative cases

- Create an AVAILABLE driver but send no GPS update: it must not be selected by geo-aware Dispatch.
- Wait beyond the location max age and create an order: stale driver should be excluded.
- Give a driver capacity 1 and race multiple orders: Phase 3 locking must still protect the capacity invariant.

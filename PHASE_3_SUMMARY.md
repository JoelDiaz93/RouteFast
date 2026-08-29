# Phase 3 Summary — Reliability & Concurrency

Phase 3 hardens RouteFast against the failure modes intentionally left visible in Phase 2.

## Implemented

- Transactional Outbox in Order, Driver and Dispatch services;
- Consumer Inbox for processed integration event IDs;
- event IDs and correlation IDs propagated across RabbitMQ;
- REST idempotency key for order creation;
- RabbitMQ retry queues with bounded retries;
- final Dead Letter Queues per consumer queue;
- concurrency-safe driver reservation using PostgreSQL row locking plus per-order advisory locking;
- BullMQ delayed dispatch assignment timeout backed by Redis;
- Saga compensation for an assigned driver reservation;
- compensation of late driver reservations after timeout/failure;
- Dispatch state expansion: `COMPENSATING` and `CANCELLED`;
- operator cancellation endpoint for dispatches.

## Reliability model

```text
Business state + Outbox event
          │
          └── same PostgreSQL transaction
                    ↓
               Outbox worker
                    ↓
                 RabbitMQ
                    ↓
              Consumer Inbox
                    ↓
              Idempotent handler
```

The system uses **at-least-once delivery**. Duplicate publication is acceptable; consumers are designed to tolerate duplicates.

## Concurrency model

Driver reservation uses a database transaction with `SELECT ... FOR UPDATE` and `SKIP LOCKED` candidate selection. This prevents two concurrent reservations from mutating the same driver row simultaneously.

The database remains the source of truth for capacity. Redis is not used as the authoritative driver-capacity lock.

## Retry / DLQ

On consumer failure:

```text
main queue
   ↓ failure
retry queue (TTL)
   ↓
main queue
   ↓ repeated failure
DLQ
```

Defaults:

- maximum retries: 3;
- retry delay: 3 seconds;
- final queue: `<main-queue>.dlq`.

## Assignment timeout

Dispatch Service schedules a BullMQ delayed job after starting a dispatch. If the dispatch is still `SEARCHING_DRIVER` when the job executes, it transitions to `FAILED` with `ASSIGNMENT_TIMEOUT`.

If a driver reservation result arrives after timeout, Dispatch emits `driver.release_requested.v1` to compensate the late reservation.

## Compensation flow

```text
POST /dispatches/:id/cancel
        ↓
Dispatch = COMPENSATING
        ↓
driver.release_requested.v1
        ↓
Driver releases capacity atomically
        ↓
driver.released.v1
        ↓
Dispatch = CANCELLED
        ↓
dispatch.cancelled.v1
        ↓
Order = CANCELLED
```

This demonstrates a Saga compensation rather than a cross-service distributed database transaction.

## Deliberate remaining gaps

Phase 3 does not yet implement:

- PostGIS / Redis GEO;
- GPS streaming;
- route/ETA providers;
- OpenTelemetry;
- Kubernetes;
- AWS deployment;
- DLQ operator replay API;
- multi-region guarantees.

Those belong to later phases and are intentionally kept outside the reliability milestone.

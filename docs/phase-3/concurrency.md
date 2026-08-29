# Driver Reservation Concurrency

## Invariants

RouteFast protects two different concurrency rules:

```text
1. reserved orders on a driver <= driver capacity
2. one order cannot hold active reservations on two different drivers
```

The second invariant matters because RabbitMQ is at-least-once: the same reservation event can be duplicated and even processed concurrently.

## Race A — driver capacity

```text
Driver capacity = 1

Order A ──┐
          ├── reserve Driver 22 concurrently
Order B ──┘
```

Driver Service selects a candidate inside a PostgreSQL transaction with a row-level write lock and `SKIP LOCKED`. Concurrent workers cannot mutate the same candidate row simultaneously.

## Race B — duplicate event for one order

```text
same driver.reservation_requested event
          ├── worker A → Driver 22
          └── worker B → Driver 31
```

A driver-row lock alone cannot prevent this because the workers could select different rows.

Phase 3 therefore introduces `driver_reservations` with a unique `order_id` and acquires a PostgreSQL transaction-scoped advisory lock based on `orderId` before selecting a driver:

```text
pg_advisory_xact_lock(hashtext(orderId))
        ↓
check existing reservation
        ↓
lock driver candidate
        ↓
update driver capacity
        +
insert driver_reservation
        +
insert Outbox event
        ↓
COMMIT
```

This serializes only competing work for the same order; it is not a global dispatch lock.

## Why PostgreSQL instead of Redis locks

Driver capacity and active reservation ownership already live in Driver Service PostgreSQL. Keeping the concurrency invariant in the authoritative data store avoids a second lock source of truth and eliminates lock-expiry correctness questions.

Redis is introduced in Phase 3 for BullMQ delayed work and will gain GEO/cache responsibilities in Phase 4.

## Trade-off

`SKIP LOCKED` favors throughput when many workers and drivers exist. With very few candidate drivers, temporary lock contention can cause a request to report no candidate. A later bounded re-selection policy can improve that behavior without weakening either invariant.

# RouteFast Architecture

## Architecture goals

RouteFast is designed to demonstrate how a logistics platform can evolve from a simple REST foundation into a reliable distributed system without introducing distributed complexity before it is required.

The architecture therefore has two views:

1. **Current architecture** — what exists in Phase 1.
2. **Target architecture** — the intentional end-state for later phases.

---

# Current architecture — Phase 1

```text
Client
  │
  ▼
API Gateway :3000
  │  HTTP + x-correlation-id
  ▼
Order Service :3001
  │
  ├── Interfaces / HTTP
  ├── Application Use Cases
  ├── Domain
  └── Infrastructure / TypeORM
          │
          ▼
     PostgreSQL
```

## Dependency direction inside Order Service

```text
HTTP Controller
      │
      ▼
Application Use Case
      │
      ▼
Domain

Application ───► Repository Port
                    ▲
                    │
             TypeORM Adapter
```

The domain layer does not import NestJS, TypeORM, PostgreSQL, HTTP, or RabbitMQ.

---

# Target architecture

```text
                                ┌───────────────┐
                                │ Operations UI │
                                └───────┬───────┘
                                        │
┌─────────────┐                  ┌───────▼───────┐
│ Client Apps │─────────────────►│  API Gateway  │
└─────────────┘                  └───────┬───────┘
                                        │
               ┌────────────────────────┼────────────────────────┐
               │                        │                        │
         ┌─────▼─────┐            ┌─────▼──────┐          ┌─────▼──────┐
         │   Order   │            │   Driver   │          │  Tracking  │
         │  Service  │            │  Service   │          │  Service   │
         └─────┬─────┘            └─────┬──────┘          └─────┬──────┘
               │                        │                        │
               └──────────────┬─────────┴─────────┬──────────────┘
                              │                   │
                              ▼                   │
                     ┌─────────────────┐           │
                     │    RabbitMQ     │◄──────────┘
                     └────────┬────────┘
                              │
                       ┌──────▼──────┐
                       │  Dispatch   │
                       │ Orchestrator│
                       └──────┬──────┘
                              │
              ┌───────────────┼────────────────┐
              │               │                │
        ┌─────▼─────┐   ┌─────▼──────┐  ┌─────▼──────────┐
        │  Routing  │   │Notification│  │ Operations/Audit│
        │  Service  │   │  Service   │  │     Service     │
        └───────────┘   └────────────┘  └────────────────┘
```

---

## Communication rules

### HTTP

Use synchronous HTTP for:

- client-facing commands where acceptance/rejection must be immediate;
- queries that require current authoritative data;
- internal calls only when the caller cannot continue without the response.

### RabbitMQ

Use asynchronous messages for:

- domain/integration events;
- workflow progression;
- side effects;
- retryable background work;
- decoupling independently scalable consumers.

---

## Consistency model

Within one service/database transaction:

- ACID consistency.

Across services:

- eventual consistency;
- Saga orchestration for critical multi-step dispatch workflows;
- compensating operations instead of distributed database transactions.

### Delivery guarantees

RabbitMQ consumers are designed for **at-least-once delivery**.

Phase 3 implements the required controls:

- idempotent business handlers;
- Consumer Inbox;
- Transactional Outbox for reliable publication;
- event IDs and correlation IDs;
- bounded retries and DLQs.

---

## Concurrency strategy

Driver assignment explicitly addresses both capacity races and duplicate-event races.

Implemented controls:

1. PostgreSQL row-level write locking for driver capacity;
2. `SKIP LOCKED` candidate selection for concurrent workers;
3. transaction-scoped advisory locking per `orderId`;
4. unique active reservation ownership in `driver_reservations`;
5. idempotency keys for order creation;
6. Inbox/event IDs for message deduplication.

No design may rely solely on "requests usually arrive one at a time".

---

## Geospatial strategy

Future driver candidate discovery:

- Redis GEO for low-latency, ephemeral current-location candidate lookup;
- PostGIS for authoritative geospatial queries and durable spatial data;
- Routing Service abstracts external ETA/directions providers.

---

## Observability strategy

Phase 1 starts with a correlation ID propagated across the synchronous call.

Later phases add:

- OpenTelemetry trace context;
- structured JSON logging;
- service metrics;
- queue depth metrics;
- business metrics;
- Prometheus/Grafana;
- Jaeger;
- CloudWatch in AWS.

A delivery must eventually be traceable end-to-end by `correlationId`, `orderId`, `dispatchId`, and `deliveryId`.

---

## Deployment strategy

Each application under `apps/` must remain independently deployable.

Target deployment progression:

1. local Node processes + Docker PostgreSQL;
2. Docker containers;
3. complete Docker Compose environment;
4. Kubernetes with health probes and HPA;
5. AWS deployment and CloudWatch integration.



---

## Current deployment topology — Phase 3

```text
API Gateway :3000
  ├── HTTP -> Order Service :3001 -> Order PostgreSQL :55432
  ├── HTTP -> Driver Service :3002 -> Driver PostgreSQL :55433
  └── HTTP -> Dispatch Service :3003 -> Dispatch PostgreSQL :55434

Order / Driver / Dispatch
       ↕
RabbitMQ :5672
Management :15672
Redis / BullMQ :6379
```

### Queue ownership

- `routefast.order.events` is consumed only by Order Service.
- `routefast.driver.events` is consumed only by Driver Service.
- `routefast.dispatch.events` is consumed only by Dispatch Service.

Producers target a service queue using an explicit versioned event pattern. The current topology intentionally keeps explicit service-owned queues. Fan-out choreography for notifications, audit and analytics is introduced when those consumers exist.

### Consistency semantics

Phase 3 uses eventual consistency across Order, Dispatch and Driver. No distributed transaction spans service databases. Integration-event intent is now committed through each service Transactional Outbox; Consumer Inbox and idempotent state transitions tolerate at-least-once delivery.


---

# Phase 3 Reliability Architecture

## Local transaction boundary

Each service commits its own business state and integration-event intent to the same PostgreSQL database transaction. Cross-service publication is asynchronous through the Outbox worker.

```text
Application command
      ↓
PostgreSQL transaction
  ├── domain state
  └── outbox_events
      ↓ COMMIT
Outbox worker
      ↓
RabbitMQ
```

This preserves database ownership: no service participates in another service's transaction.

## Event delivery semantics

RouteFast is **at least once**. All Phase 3 integration events contain an `eventId`. Consumers persist processed IDs in `inbox_events` and business handlers are designed to tolerate duplicate state transitions.

## Driver concurrency

The Driver database is the capacity source of truth. Reservation candidate selection occurs under a PostgreSQL write lock. `SKIP LOCKED` allows horizontally scaled workers to avoid concurrently mutating the same candidate row.

## Temporal orchestration

RabbitMQ remains the cross-service event backbone. BullMQ/Redis is introduced only for delayed internal work, initially assignment expiration.

```text
Dispatch started
    ├── RabbitMQ → Driver reservation
    └── BullMQ delayed timeout
                 ↓
          if still SEARCHING_DRIVER
                 ↓
             FAILED
```

## Saga compensation

Dispatch Service owns the critical workflow. Cancelling an already assigned dispatch is not a distributed rollback; it is an explicit forward-moving compensation:

```text
ASSIGNED
   ↓
COMPENSATING
   ↓ driver.release_requested.v1
Driver releases capacity
   ↓ driver.released.v1
CANCELLED
   ↓ dispatch.cancelled.v1
Order CANCELLED
```

This makes intermediate failure states observable and recoverable.

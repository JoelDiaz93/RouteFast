# RouteFast

**Distributed Last-Mile Logistics & Delivery Orchestration Platform**

> Fast decisions. Reliable deliveries.

RouteFast is a backend-focused engineering project for the hard parts of last-mile logistics: service boundaries, asynchronous workflows, concurrent driver assignment, delivery guarantees, geospatial search, resilience, observability and horizontal scale.

The project evolves by technical risk. Each phase intentionally exposes a new failure mode before introducing the pattern that solves it.

---

## Product objective

RouteFast coordinates the backend lifecycle behind a delivery:

```text
Order created
    ↓
Dispatch workflow
    ↓
Find / reserve driver
    ↓
Assignment
    ↓
Pickup
    ↓
In transit
    ↓
Delivered
```

It is not primarily a consumer delivery UI. The core product is the **distributed dispatch and operations platform**.

## Engineering problem

The system must eventually remain correct when:

- many orders compete for the same driver capacity;
- messages are duplicated or delayed;
- a service fails halfway through assignment;
- a database commit succeeds but broker publication fails;
- no driver answers in time;
- GPS events arrive continuously;
- routing providers become unavailable;
- services scale horizontally;
- operators must trace a delivery across service and queue boundaries.

A CRUD-only architecture does not address these conditions.

---

# Current state — Phase 3: Reliability & Concurrency ✅

Phase 3 hardens the distributed dispatch workflow against duplicate messages, broker/database dual-write failures, concurrent driver reservations and partial Saga failures.

```text
Client
  ↓
API Gateway
  ↓ HTTP
Order Service ───────────────► Order PostgreSQL
  │                              │
  │                              └── business state + Outbox (atomic)
  ▼
Outbox Worker → RabbitMQ → Dispatch Service ──► Dispatch PostgreSQL
                              │                     │
                              │                     ├── Outbox / Inbox
                              │                     └── BullMQ timeout → Redis
                              ▼
                           RabbitMQ
                              ↓
                         Driver Service ─────────► Driver PostgreSQL
                              │                     │
                              │                     └── row-locked capacity reservation
                              └── Outbox → RabbitMQ
```

### Implemented in Phase 3

- Transactional Outbox in Order, Driver and Dispatch services;
- Consumer Inbox and integration `eventId` deduplication;
- order creation `Idempotency-Key` support;
- bounded RabbitMQ retry queues and final DLQs;
- concurrency-safe driver reservation with PostgreSQL row locking;
- BullMQ + Redis delayed assignment expiration;
- Saga compensation for assigned deliveries;
- late-reservation compensation after timeout/failure;
- explicit `COMPENSATING` / `CANCELLED` dispatch states;
- operator cancellation endpoint;
- correlation IDs preserved across HTTP, Outbox and RabbitMQ.

### Reliability model

```text
Business change
      +
Outbox event
      │
      └── ONE local DB transaction
                ↓
           async publisher
                ↓
             RabbitMQ
                ↓
          Consumer Inbox
                ↓
        idempotent business effect
```

RouteFast deliberately uses **at-least-once delivery**, not a false "exactly once" claim. Outbox publication may duplicate an event after a crash; the event ID, Inbox and idempotent state transitions make that safe.

### Concurrency invariant

```text
reserved orders <= driver capacity
```

Driver Service reserves capacity inside a PostgreSQL transaction with a row-level write lock. Concurrent workers cannot mutate the same candidate reservation simultaneously.

### Saga compensation

```text
Assigned Dispatch
      ↓ operator/system cancellation
COMPENSATING
      ↓
driver.release_requested.v1
      ↓
Driver releases reservation
      ↓
driver.released.v1
      ↓
Dispatch = CANCELLED
      ↓
dispatch.cancelled.v1
      ↓
Order = CANCELLED
```

A late `driver.reserved.v1` arriving after an assignment timeout is also compensated rather than leaking driver capacity.

### Retry / DLQ topology

```text
main queue
   ↓ handler failure
retry queue (TTL)
   ↓
main queue
   ↓ retries exhausted
DLQ
```

See [`PHASE_3_SUMMARY.md`](./PHASE_3_SUMMARY.md), [`docs/phase-3/reliability-flow.md`](./docs/phase-3/reliability-flow.md) and [`docs/phase-3/concurrency.md`](./docs/phase-3/concurrency.md).

---

## Repository structure

```text
RouteFast/
├── apps/
│   ├── api-gateway/
│   ├── order-service/
│   ├── driver-service/
│   └── dispatch-service/
├── docs/
│   ├── adr/
│   ├── domain/
│   ├── phase-1/
│   ├── phase-2/
│   └── phase-3/
├── ARCHITECTURE.md
├── PROJECT_SCOPE.md
├── ROADMAP.md
├── PHASE_1_SUMMARY.md
├── PHASE_2_SUMMARY.md
├── PHASE_3_SUMMARY.md
├── docker-compose.yml
└── routefast.http
```

**Services do not share domain entities, repositories or database tables.** Integration contracts are explicit external messages rather than shared domain models.

---

## API Gateway

Base URL: `http://localhost:3000/api/v1`

### Orders

```http
POST  /orders
GET   /orders
GET   /orders/:orderId
PATCH /orders/:orderId/cancel
```

### Drivers

```http
POST  /drivers
GET   /drivers
PATCH /drivers/:driverId/availability
```

### Dispatch operations

```http
GET /dispatches
GET  /dispatches/:dispatchId
POST /dispatches/:dispatchId/cancel
```

Use [`routefast.http`](./routefast.http) for the current reliability/compensation smoke flow.

---

## Run locally

Requirements:

- Node.js 22+
- npm 10+
- Docker / Docker Compose

```bash
cp .env.example .env
npm install
docker compose up -d
```

RabbitMQ Management:

```text
http://localhost:15672
user: routefast
password: routefast
```

Run each application in a separate terminal:

```bash
npm run start:order
npm run start:driver
npm run start:dispatch
npm run start:gateway
```

Then execute the requests in `routefast.http`.

### Quality commands

```bash
npm run typecheck
npm test
npm run test:cov
npm run build
```

---

## Target technology path

| Area | Technology / pattern |
|---|---|
| Backend | NestJS + TypeScript |
| API | REST |
| Domain | DDD + Ports & Adapters |
| Workflow | CQRS + Saga orchestration |
| Messaging | RabbitMQ |
| Persistence | PostgreSQL / PostGIS |
| Reliability | Outbox, Inbox, idempotency, retries, DLQ |
| Coordination | Redis + BullMQ |
| Geospatial | Redis GEO + PostGIS |
| Real time | WebSockets |
| Observability | OpenTelemetry, Prometheus, Grafana, Jaeger |
| Containers | Docker |
| Orchestration | Kubernetes |
| Cloud | AWS + CloudWatch |
| Delivery | GitHub Actions / CI/CD |

---

## Engineering principles

1. **Correctness before scale.**
2. **Each bounded context owns its data and invariants.**
3. **No cross-service database access.**
4. **Consistency semantics are explicit.**
5. **Complexity must solve a demonstrated failure mode.**
6. **CQRS and events are selective tools, not architectural decoration.**
7. **Observability begins with correlation and grows with the system.**
8. **Known reliability gaps are documented rather than hidden.**

---

## Documentation

- [`PROJECT_SCOPE.md`](./PROJECT_SCOPE.md)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`ROADMAP.md`](./ROADMAP.md)
- [`PHASE_2_SUMMARY.md`](./PHASE_2_SUMMARY.md)
- [`docs/domain/bounded-contexts.md`](./docs/domain/bounded-contexts.md)
- [`docs/phase-2/event-catalog.md`](./docs/phase-2/event-catalog.md)
- [`docs/phase-2/sequence.md`](./docs/phase-2/sequence.md)
- [`docs/adr`](./docs/adr)

## Portfolio positioning

RouteFast is designed to demonstrate more than NestJS familiarity:

- defining service boundaries;
- choosing synchronous vs asynchronous communication;
- modeling state transitions and invariants;
- implementing event-driven workflows;
- applying CQRS where justified;
- reasoning about consistency and duplicate delivery;
- preparing for concurrency, compensation and failure recovery;
- operating independently deployable services.

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

# Current state — Phase 2: Event-Driven Services ✅

Phase 1 established a clean Order bounded context. Phase 2 now makes the first distributed dispatch workflow executable.

```text
Client
  │
  ▼
API Gateway :3000
  │ HTTP
  ├─────────────► Order Service :3001 ─────► Order DB :55432
  │                    │
  │                    │ order.ready_for_dispatch.v1
  │                    ▼
  │                 RabbitMQ :5672
  │                    │
  │                    ▼
  ├─────────────► Dispatch Service :3003 ──► Dispatch DB :55434
  │                    │
  │                    │ driver.reservation_requested.v1
  │                    ▼
  │                 RabbitMQ
  │                    │
  │                    ▼
  └─────────────► Driver Service :3002 ────► Driver DB :55433
                       │
                       └── driver.reserved.v1 / reservation_failed.v1
```

### Implemented

- NestJS monorepo with four independently deployable applications;
- API Gateway;
- Order Service with DDD + Clean Architecture;
- Driver Service with its own aggregate and database;
- Dispatch Service as workflow owner;
- RabbitMQ asynchronous integration;
- versioned integration event names;
- NestJS CQRS selectively inside Dispatch Service;
- service-local PostgreSQL databases;
- correlation IDs across HTTP and RabbitMQ payloads;
- manual RMQ acknowledgements;
- health/readiness endpoints;
- Docker Compose with three PostgreSQL instances + RabbitMQ Management;
- domain/unit tests;
- ADRs and explicit reliability gaps.

### Main asynchronous workflow

```text
POST /orders
    ↓
Order persisted
    ↓
order.ready_for_dispatch.v1
    ↓
Dispatch Service
    ↓
dispatch.started.v1 ───────────────► Order = DISPATCHING
    ↓
driver.reservation_requested.v1
    ↓
Driver Service
    ├── driver.reserved.v1
    │       ↓
    │   Dispatch = ASSIGNED
    │       ↓
    │   dispatch.assigned.v1 ──────► Order = ASSIGNED
    │
    └── driver.reservation_failed.v1
            ↓
        Dispatch = FAILED
            ↓
        dispatch.failed.v1 ────────► Order = PENDING_DISPATCH
```

See [`docs/phase-2/sequence.md`](./docs/phase-2/sequence.md) and [`docs/phase-2/event-catalog.md`](./docs/phase-2/event-catalog.md).

---

## Why CQRS is selective

CQRS is used in Dispatch Service because dispatch has two distinct concerns:

- **commands** mutate workflow state in response to integration events;
- **queries** expose operational dispatch state.

Order and Driver services use regular application use cases because adding CQRS there would currently add more ceremony than value.

This is documented in [`ADR-007`](./docs/adr/007-cqrs-dispatch-service.md).

---

## Deliberate Phase 2 reliability gaps

Phase 2 is event-driven, but it does not pretend to be production-safe yet.

### 1. Database + RabbitMQ dual write

Currently:

```text
save order to PostgreSQL ✓
        ↓
publish RabbitMQ event ✕
```

can leave persisted state without its integration event.

Phase 3 replaces direct publication with **Transactional Outbox**.

### 2. Driver reservation race

Phase 2 selects an available driver and then saves the reservation. Two concurrent consumers can still race around that selection.

Phase 3 adds **optimistic concurrency / atomic reservation** and concurrency tests.

### 3. Duplicate delivery

There is no Consumer Inbox yet. Phase 3 makes consumers idempotent.

### 4. Failed messages

Manual acknowledgements are implemented, but retry queues, DLQ topology and replay tooling belong to Phase 3.

The point of these gaps is architectural progression: the project first makes the failure mode visible, then implements the reliability pattern that addresses it.

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
│   └── phase-2/
├── ARCHITECTURE.md
├── PROJECT_SCOPE.md
├── ROADMAP.md
├── PHASE_1_SUMMARY.md
├── PHASE_2_SUMMARY.md
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
GET /dispatches/:dispatchId
```

Use [`routefast.http`](./routefast.http) for a complete Phase 2 smoke flow.

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

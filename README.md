# RouteFast

**Distributed Last-Mile Logistics & Delivery Orchestration Platform**

> Fast decisions. Reliable deliveries.

RouteFast is a backend-focused engineering project designed to model the difficult parts of last-mile logistics: concurrent driver assignment, distributed workflows, event delivery guarantees, geospatial search, real-time tracking, resilience, observability, and horizontal scalability.

The project is intentionally built in phases so that every architectural decision can be explained, tested, and evolved instead of hiding complexity behind a large "demo" application.

---

## 1. Product objective

RouteFast receives delivery orders and coordinates the lifecycle required to move them from creation to completion:

```text
Order created
    ↓
Validate order
    ↓
Dispatch request
    ↓
Find candidate drivers
    ↓
Reserve one driver atomically
    ↓
Driver accepts
    ↓
Pickup
    ↓
In transit
    ↓
Delivered
```

The product is not primarily a consumer delivery UI. Its core is the **distributed backend and operations platform** behind dispatching and delivery execution.

---

## 2. Problem being solved

A real delivery system must remain correct when:

- multiple orders compete for the same driver;
- a message is delivered more than once;
- a service crashes halfway through a workflow;
- a driver never answers an assignment;
- GPS events arrive continuously and out of order;
- external routing providers become slow or unavailable;
- a database commit succeeds but event publication fails;
- services scale horizontally;
- operators need to trace one delivery across several services.

A simple CRUD architecture is not enough for those scenarios.

---

## 3. Engineering solution

RouteFast will evolve toward the following architecture:

```text
                       Clients
              Web / Driver / Operations
                         │
                         ▼
                  ┌─────────────┐
                  │ API Gateway │
                  │   NestJS    │
                  └──────┬──────┘
                         │
       ┌─────────────────┼──────────────────┐
       ▼                 ▼                  ▼
 Order Service      Driver Service     Tracking Service
       │                 │                  │
       └─────────────────┼──────────────────┘
                         ▼
                 Dispatch Orchestrator
                         │
                      RabbitMQ
                         │
       ┌─────────────────┼──────────────────┐
       ▼                 ▼                  ▼
 Routing Service   Notification Service   Audit/Events
       │
       └──────────────► PostgreSQL + PostGIS

               Redis / BullMQ / OpenTelemetry
```

### Target technical concepts

- NestJS + TypeScript
- REST APIs
- independently deployable microservices
- Domain-Driven Design (DDD)
- Clean Architecture / Ports & Adapters
- CQRS where command/query separation adds value
- RabbitMQ
- Saga orchestration and compensating actions
- Transactional Outbox + Consumer Inbox
- Idempotency
- optimistic concurrency control
- Redis distributed coordination and GEO indexes
- PostgreSQL + PostGIS
- BullMQ delayed/internal jobs
- WebSockets for real-time tracking
- OpenTelemetry + Prometheus + Grafana + Jaeger
- Docker
- Kubernetes
- AWS integration and CloudWatch
- CI/CD, code quality gates, testing and failure injection

---

## 4. Current implementation — Phase 1: Foundation

Phase 1 establishes the boundaries before distributed complexity is introduced.

Implemented now:

- NestJS monorepo with independently deployable applications;
- `api-gateway` REST entry point;
- `order-service` as the first bounded-context service;
- DDD order aggregate and state transition rules;
- application use cases isolated from NestJS and TypeORM;
- repository port + TypeORM adapter;
- PostgreSQL persistence;
- health endpoints;
- request correlation ID propagation;
- REST API for create/list/read/cancel order;
- unit tests for domain and application behavior;
- Docker Compose for local PostgreSQL;
- architecture, scope, ADRs and phase acceptance criteria.

Not implemented yet by design:

- RabbitMQ;
- driver assignment;
- dispatch orchestration;
- Redis;
- geospatial search;
- Saga / Outbox / Inbox;
- real-time GPS tracking;
- Kubernetes;
- AWS deployment;
- observability stack.

Those capabilities are explicitly assigned to later phases. See [`ROADMAP.md`](./ROADMAP.md).

---

## 5. Repository structure

```text
RouteFast/
├── apps/
│   ├── api-gateway/
│   └── order-service/
├── docs/
│   ├── adr/
│   ├── domain/
│   └── phase-1/
├── ARCHITECTURE.md
├── PROJECT_SCOPE.md
├── ROADMAP.md
├── docker-compose.yml
└── README.md
```

The most important rule is intentional: **services do not share domain entities or repositories**. Each bounded context owns its model and persistence.

---

## 6. Phase 1 API

Gateway base URL: `http://localhost:3000/api/v1`

### Health

```http
GET /health
```

### Create order

```http
POST /api/v1/orders
Content-Type: application/json
```

```json
{
  "customerId": "CUS-1001",
  "priority": "STANDARD",
  "pickup": {
    "label": "Warehouse North",
    "address": "Av. Example 100",
    "latitude": -0.164,
    "longitude": -78.472
  },
  "dropoff": {
    "label": "Customer",
    "address": "Calle Example 200",
    "latitude": -0.189,
    "longitude": -78.487
  }
}
```

### Get order

```http
GET /api/v1/orders/:orderId
```

### List orders

```http
GET /api/v1/orders
```

### Cancel pending order

```http
PATCH /api/v1/orders/:orderId/cancel
```

---

## 7. Running Phase 1 locally

### Requirements

- Node.js 22+
- npm 10+
- Docker / Docker Compose

### Environment

```bash
cp .env.example .env
```

### Start PostgreSQL

```bash
docker compose up -d postgres
```

### Install dependencies

```bash
npm install
```

### Run the order service

```bash
npm run start:order
```

### Run the API gateway

In another terminal:

```bash
npm run start:gateway
```

### Tests

```bash
npm test
```

### Build

```bash
npm run build
```

---

## 8. Engineering principles

1. **Correctness before scale.** The domain model and invariants are defined before adding distributed infrastructure.
2. **Database ownership.** Each microservice owns its data. No cross-service table access.
3. **Explicit consistency model.** We will not pretend distributed workflows are ACID transactions.
4. **At-least-once safe consumers.** Future consumers must be idempotent.
5. **Observability is a feature.** Correlation begins in Phase 1 and evolves into distributed tracing.
6. **No microservice without a boundary.** A service must represent a cohesive business capability, not a folder split.
7. **Complexity must earn its place.** RabbitMQ, Redis, CQRS, Kubernetes, and other tools are introduced only where a concrete failure mode or requirement justifies them.

---

## 9. Documentation

- [`PROJECT_SCOPE.md`](./PROJECT_SCOPE.md) — scope, non-goals and system boundaries
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — current and target architecture
- [`ROADMAP.md`](./ROADMAP.md) — implementation phases
- [`docs/domain/bounded-contexts.md`](./docs/domain/bounded-contexts.md) — domain boundaries
- [`docs/adr`](./docs/adr) — architecture decision records
- [`docs/phase-1/acceptance-criteria.md`](./docs/phase-1/acceptance-criteria.md) — Phase 1 completion definition

---

## 10. Portfolio positioning

RouteFast is intended to demonstrate professional backend engineering rather than framework familiarity alone:

- designing service boundaries;
- modeling business invariants;
- handling concurrent operations;
- building reliable asynchronous workflows;
- diagnosing distributed failures;
- designing for retries and duplicate delivery;
- balancing synchronous and asynchronous communication;
- building observable and deployable services.


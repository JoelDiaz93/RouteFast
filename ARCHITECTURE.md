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

Therefore future phases require:

- idempotent consumers;
- consumer Inbox;
- Transactional Outbox for reliable publication;
- message IDs and correlation IDs.

---

## Concurrency strategy

Driver assignment will explicitly address the scenario where multiple orders compete for one driver.

Planned controls:

1. database optimistic versioning;
2. atomic reservation operation;
3. short-lived Redis coordination where justified;
4. idempotency keys;
5. invariant tests under concurrent load.

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

## Phase 2 current deployment topology

```text
API Gateway :3000
  ├── HTTP -> Order Service :3001 -> Order PostgreSQL :55432
  ├── HTTP -> Driver Service :3002 -> Driver PostgreSQL :55433
  └── HTTP -> Dispatch Service :3003 -> Dispatch PostgreSQL :55434

Order / Driver / Dispatch
       ↕
RabbitMQ :5672
Management :15672
```

### Queue ownership

- `routefast.order.events` is consumed only by Order Service.
- `routefast.driver.events` is consumed only by Driver Service.
- `routefast.dispatch.events` is consumed only by Dispatch Service.

Producers target a service queue using an explicit versioned event pattern. This Phase 2 topology is intentionally simple point-to-point messaging. Fan-out choreography for notifications, audit and analytics is introduced when those consumers exist.

### Consistency semantics

Phase 2 uses eventual consistency across Order, Dispatch and Driver. No distributed transaction spans service databases. Direct event publication is temporary and documented in ADR-006.

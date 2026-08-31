# RouteFast Architecture

## Current architecture — v0.7.2

RouteFast is a distributed last-mile logistics platform composed of five independently deployable NestJS applications plus a browser Operations Console used to validate public contracts. Each bounded context owns its persistence and invariants; integration happens through HTTP or explicit RabbitMQ events.

```mermaid
flowchart TD
  Console[React Ops Console :5173] --> GW[API Gateway :3000]
  Console -->|Socket.IO /tracking| T[Tracking Service :3004]
  Client[Other clients / Operations] --> GW
  GW --> O[Order Service :3001]
  GW --> R[Driver Service :3002]
  GW --> D[Dispatch Service :3003]
  GW --> T

  O --> ODB[(Order PostgreSQL)]
  R --> RDB[(Driver PostgreSQL)]
  D --> DDB[(Dispatch PostgreSQL)]
  T --> PG[(PostGIS)]
  T --> Redis[(Redis GEO / BullMQ)]

  O <--> MQ[(RabbitMQ)]
  R <--> MQ
  D <--> MQ
  D -->|candidate capacity| R
  D -->|nearby / ETA| T
  T --> WS[Socket.IO clients]
```

## Bounded-context ownership

| Context | Owns | Does not own |
|---|---|---|
| Order | order lifecycle, idempotent creation | driver capacity, GPS |
| Driver | driver availability, capacity, reservations | dispatch policy |
| Dispatch | assignment workflow, scoring, decision audit, route heuristic | direct driver mutation |
| Tracking | current location, GPS history, nearby search, ETA approximation | driver capacity |
| Gateway | external HTTP facade and correlation propagation | business state |

No cross-service database reads are allowed.

## Operations Console boundary

The React/Vite Operations Console is an external client, not a sixth bounded context. Leaflet/OpenStreetMap is used only for geographic presentation; backend Tracking remains the source of location truth. It contains presentation and demo orchestration only. It does not read databases, publish RabbitMQ events directly, reserve drivers, or calculate assignment policy. HTTP commands/queries pass through the API Gateway; live GPS subscription/update uses the Tracking Service Socket.IO namespace.

The guided E2E demo intentionally depends on eventual consistency: it creates public resources and observes the read models until the asynchronous dispatch workflow converges.

## Communication

### Synchronous HTTP

Used when the caller requires an immediate authoritative answer: API facade calls, Dispatch candidate queries and Tracking proximity/ETA queries. Dispatch wraps critical synchronous dependencies in circuit breakers.

### RabbitMQ

Used for workflow progression and integration events. Delivery semantics are **at least once**.

Reliability controls:

- Transactional Outbox;
- Consumer Inbox;
- event IDs + correlation IDs;
- idempotent handlers;
- bounded retries;
- dead-letter queues.

## Dispatch consistency model

```mermaid
sequenceDiagram
  participant O as Order
  participant Q as RabbitMQ
  participant D as Dispatch
  participant R as Driver

  O->>Q: order.ready_for_dispatch
  Q->>D: start dispatch
  D->>Q: driver.reservation_requested
  Q->>R: reserve ranked candidate
  R->>R: order advisory lock + row lock
  R->>Q: driver.reserved
  Q->>D: assigned
  D->>Q: dispatch.assigned
  Q->>O: order assigned
```

Across contexts the system is eventually consistent. A failed workflow is repaired with compensating events rather than distributed transactions.

## Concurrency model

Driver Service protects two independent races:

1. several orders competing for one driver's capacity;
2. duplicated concurrent reservation events for one order selecting different drivers.

Controls include `FOR UPDATE` / `SKIP LOCKED`, transaction-scoped advisory locking by `orderId`, capacity validation, unique reservation ownership, API idempotency and Inbox deduplication.

## Tracking model

```text
GPS → Tracking → Redis GEO → immediate live state
              ├→ Socket.IO → clients
              └→ BullMQ → PostGIS → durable history
```

An out-of-order GPS event may be stored in history but cannot overwrite a newer current position in Redis.

## Decisioning

Dispatch combines nearby location data with authoritative Driver capacity data. `geo-score-v1` ranks candidates by distance, remaining capacity, current load and GPS freshness. Driver Service still performs the final transactional reservation validation.

The multi-order `paired-insertion-v1` planner is a bounded heuristic with pickup-before-dropoff and capacity invariants. It is not presented as an optimal VRP solver.

## Failure containment

- RabbitMQ retry + DLQ for asynchronous failures.
- BullMQ delayed assignment timeout.
- Saga compensation for release/cancellation.
- Circuit breaker for synchronous Driver/Tracking dependencies.
- Liveness/readiness separation for orchestration platforms.

## Observability

All applications expose structured JSON logs and Prometheus metrics and initialize OpenTelemetry tracing.

```text
NestJS → OTLP → OpenTelemetry Collector → Jaeger
NestJS / RabbitMQ → Prometheus → Grafana
Logs → stdout/container pipeline
```

Operational correlation uses both `correlationId` and OpenTelemetry `traceId`.

## Deployment model

- one monorepo;
- five independent application images;
- stateless application workloads on Kubernetes;
- HPA in the portable base;
- optional KEDA overlay for RabbitMQ backlog-driven scaling;
- PostgreSQL/PostGIS, RabbitMQ and Redis treated as external stateful dependencies in the cloud target.

AWS blueprint: EKS + ALB, RDS/PostGIS, Amazon MQ RabbitMQ, ElastiCache Redis and ADOT to CloudWatch/X-Ray.

## Engineering boundary

The architecture is intentionally considered feature-complete for the portfolio objective. Further changes require evidence from reliability, stress testing or product requirements. See [progressive stress methodology](./docs/performance/STRESS_TEST.md) and the [ADR index](./docs/adr/README.md).


## Operations Console interaction model

The Operations Console uses one **unified operations + engineering interaction model**. There is no Simple/Technical mode split. All public contracts and engineering evidence remain available, while every screen also provides explicit purpose, core-operation and backend-source context. This improves clarity without creating a second set of business rules or hiding important system behavior.


## v0.7.4 presentation routing boundary

The Operations Console can request a driver route, but ownership remains split deliberately:

- RouteFast Dispatch/Optimization decides the stop sequence and capacity-constrained plan.
- Tracking provides the driver's current position.
- The browser map may request OSRM geometry only to draw that ordered plan on roads.
- If OSRM is unavailable, direct geometry is a visual fallback; no backend decision changes.

Theme selection and filters are browser presentation state and have no domain authority.


## v0.7.5 operational route boundary

The user-facing route surface is **Live Map**. Driver selection can trigger the existing backend route-plan contract automatically, but route ordering remains backend-owned. The browser may query OSRM for road geometry and duration; those values are presentation data only and never change assignment, capacity or stop-order decisions.

The separate Optimization Lab is always available as an engineering comparison surface for `paired-insertion-v1` versus sequential distance. It is not a second operational map; Live Tracking remains the route execution/inspection surface.

The basemap uses standard OpenStreetMap tiles without an application API key. Dark mode is a CSS treatment of that same tile layer, avoiding a second provider-specific credential path.


## v0.7.6 unified console boundary

The console no longer maintains separate experience modes. Overview, Orders, Drivers, Tracking, Dispatch, Optimization and API Activity are always reachable. A shared page-context strip declares each screen's purpose, primary operations and owning backend capability. This is presentation metadata only: it does not alter domain ownership, routing decisions or persistence boundaries.

# RouteFast Engineering Roadmap

The roadmap is organized around technical risk, not UI milestones.

## Phase 1 — Foundation ✅

**Goal:** establish domain boundaries and a clean, testable NestJS foundation.

Deliverables:

- NestJS monorepo;
- API Gateway;
- Order Service;
- DDD aggregate;
- Clean Architecture / repository port;
- PostgreSQL + TypeORM;
- REST endpoints;
- correlation IDs;
- unit tests;
- architecture documentation and ADRs.

Exit criteria: [`docs/phase-1/acceptance-criteria.md`](./docs/phase-1/acceptance-criteria.md)

---

## Phase 2 — Event-Driven Services ✅

**Goal:** introduce meaningful service decomposition and asynchronous integration.

Deliverables:

- Driver Service;
- Dispatch Service;
- RabbitMQ;
- explicit integration events;
- CQRS in Dispatch where justified;
- contract versioning;
- service-local databases;
- Docker Compose for all services.

Key demonstration:

> synchronous REST for immediate operations vs event-driven communication for independent workflow progress.

Exit criteria: [`docs/phase-2/acceptance-criteria.md`](./docs/phase-2/acceptance-criteria.md)

---

## Phase 3 — Reliability & Concurrency

**Goal:** make dispatch correct under retries, duplicates, concurrent requests and partial failures.

Deliverables:

- Saga orchestrator;
- driver reservation state machine;
- optimistic concurrency;
- idempotency keys;
- Transactional Outbox;
- Consumer Inbox;
- retry queues;
- DLQ;
- BullMQ delayed assignment expiration;
- concurrency/load tests;
- compensation flows.

Key demonstration:

> two orders cannot reserve the same unavailable capacity, and duplicate events cannot duplicate business effects.

---

## Phase 4 — Geospatial & Real-Time Operations

**Goal:** introduce the logistics-specific technical complexity.

Deliverables:

- PostgreSQL + PostGIS;
- Redis GEO;
- candidate driver search;
- driver scoring engine;
- Routing Service abstraction;
- WebSocket tracking;
- position ingestion policy;
- SLA engine;
- Operations Console.

Key demonstration:

> fast candidate discovery, real-time visibility, and business-driven assignment scoring.

---

## Phase 5 — Observability, Cloud & Delivery

**Goal:** demonstrate production operation and deployment maturity.

Deliverables:

- OpenTelemetry;
- Prometheus;
- Grafana;
- Jaeger;
- structured logging;
- failure injection scenarios;
- Docker images;
- Kubernetes manifests;
- readiness/liveness probes;
- HPA;
- GitHub Actions;
- quality/security gates;
- AWS deployment;
- CloudWatch dashboards/alarms.

Key demonstration:

> diagnosing a failed delivery workflow across services and queues using traces, logs and metrics.

---

## Optional Phase 6 — Optimization

Only after the core architecture is reliable:

- multi-order route batching;
- capacity-aware routing heuristic;
- advanced dispatch scoring;
- simulated demand peaks;
- performance profiling;
- cache strategy evaluation.

This phase explicitly avoids pretending that a portfolio project solves the full Vehicle Routing Problem optimally.


# RouteFast — Engineering case study

## Problem

A last-mile platform must coordinate orders, drivers, assignments and continuous location updates under concurrency and partial failure. The difficult part is not CRUD; it is preserving invariants when messages are duplicated, services fail between steps, multiple orders compete for the same capacity and GPS arrives out of order.

## Engineering approach

RouteFast was built by introducing complexity only when a concrete failure mode justified it:

1. **Foundation:** DDD/Clean Architecture and explicit service boundaries.
2. **Event-driven workflow:** RabbitMQ and a Dispatch orchestrator.
3. **Reliability:** Transactional Outbox, Consumer Inbox, idempotency, retries/DLQ, PostgreSQL locking and Saga compensation.
4. **Logistics:** PostGIS, Redis GEO, real-time tracking, driver scoring and ETA/SLA signals.
5. **Operability:** OpenTelemetry, Prometheus/Grafana, Jaeger, Docker, Kubernetes, CI/CD and AWS deployment blueprint.
6. **Hardening:** circuit breakers, performance budgets, profiling, KEDA and bounded multi-order route planning.

## Critical design decisions

### Reservation correctness

Driver capacity is authoritative in Driver Service. Dispatch may rank candidates but cannot mutate capacity. Reservation uses transaction-scoped order locks, row locking and a unique reservation invariant to prevent both capacity races and duplicate-event races.

### Reliable messaging

Business state and integration events are committed through Transactional Outbox. Consumers use Inbox/event IDs and idempotent handlers. Delivery semantics are at-least-once; RouteFast does not claim exactly-once messaging.

### Tracking

Redis GEO contains the low-latency current position, while PostGIS stores durable location history. GPS timestamps are compared atomically so delayed events cannot rewind the live position.

### Resilience

Synchronous Dispatch dependencies use circuit breakers to limit cascading failure. Cross-service workflow failures use retries, DLQ and Saga compensation instead of distributed transactions.

## Measured evidence

Local v0.6.5 baseline:

- Smoke p95 **45.27 ms**, p99 **73.88 ms**, 0% HTTP errors.
- Idempotency p95 **118.36 ms**, duplicate consistency 100%, 0% errors.
- Mixed workload: **~38 iter/s**, 0% errors, 0 dropped iterations.
- Mixed Orders p95 **66.29 ms**.
- Mixed Tracking p95 **17.65 ms**.

Production dependency audit after security hardening: **0 npm production vulnerabilities reported**.

These are documented local measurements, not production capacity claims. See [performance baseline](../performance/BASELINE_v0.6.5.md) and [security baseline](../security/SECURITY_BASELINE_v0.6.4.md).

## What this project demonstrates

NestJS/TypeScript, REST, DDD, Clean Architecture, CQRS, RabbitMQ, event-driven workflows, Saga, Outbox/Inbox, idempotency, concurrency control, PostgreSQL/PostGIS, Redis/BullMQ, WebSockets, observability, Docker/Kubernetes, AWS architecture, CI/security gates, load testing and evidence-driven optimization.

## Browser validation — Operations Console

The final showcase layer is intentionally thin: a React/Vite Operations Console exercises the backend through its public contracts. Its guided demo creates a driver, publishes GPS, creates an order and observes the asynchronous dispatch until the scoring decision is available. This makes eventual consistency, correlation IDs, live tracking and compensation inspectable without granting the frontend direct access to persistence or messaging internals.

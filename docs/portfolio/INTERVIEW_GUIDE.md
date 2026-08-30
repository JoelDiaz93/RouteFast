# RouteFast interview guide

## 60-second explanation

> RouteFast is a backend-focused last-mile logistics platform I built to explore the failure modes that appear after a CRUD system becomes distributed. The core flow creates an order, orchestrates dispatch through RabbitMQ, ranks nearby drivers using tracking data, and reserves capacity in Driver Service. I used Transactional Outbox and Consumer Inbox for reliable at-least-once messaging, PostgreSQL locks and idempotency for concurrency, Saga compensation for partial failure, Redis GEO/PostGIS for tracking, and OpenTelemetry/Prometheus/Jaeger for operations. I also measured a local mixed baseline of about 38 iterations per second with 0% HTTP errors, rather than making unmeasured performance claims.

## Questions to be ready for

### Why microservices?

The project does not assume microservices are always better. The chosen bounded contexts have independent invariants and scaling profiles: order lifecycle, driver capacity, dispatch policy and high-frequency tracking. Data ownership is explicit and there are no cross-service table reads.

### Why RabbitMQ?

The dispatch workflow needs asynchronous progression, independent consumers, bounded retry and dead-lettering. Immediate request/response queries still use HTTP when the caller needs an authoritative answer before continuing.

### How do you avoid lost events?

The service transaction writes both business state and an Outbox record. A publisher forwards the durable outbox entry to RabbitMQ. This removes the database-commit/broker-publish dual-write window.

### How do you handle duplicate messages?

Integration events carry event IDs. Consumers use an Inbox and idempotent business operations. The target is at-least-once delivery with duplicate-safe processing, not exactly-once messaging.

### How do you stop two orders assigning the same driver?

Driver Service is the authority. It uses a transaction-scoped lock per order, row-level locking / `SKIP LOCKED`, capacity validation and a unique reservation invariant. Dispatch only expresses ranked preference.

### Why Redis GEO and PostGIS together?

They solve different problems. Redis GEO is the hot path for current nearby-driver lookup; PostGIS is durable spatial history and supports authoritative spatial queries. Live state can be ephemeral without losing historical evidence.

### How do you diagnose a slow delivery workflow?

Start with `correlationId`, find the distributed trace in Jaeger, correlate the slow span with Prometheus/Grafana metrics and RabbitMQ queue depth, then profile only the service implicated by the evidence.

### What would you improve next?

Only after the progressive stress test identifies a saturation point. The next change should be one measured optimization followed by the exact same benchmark. Otherwise the engineering scope is intentionally closed and the focus shifts to product/demo presentation.

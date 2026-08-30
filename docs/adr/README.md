# Architecture Decision Records

RouteFast uses ADRs to record **why** architecture choices were made, not only what technology was selected.

| ADR | Decision | Phase |
|---|---|---:|
| [001](./001-monorepo-independent-services.md) | Monorepo with independently deployable services | 1 |
| [002](./002-data-ownership.md) | Database ownership per bounded context | 1 |
| [003](./003-rabbitmq-event-backbone.md) | RabbitMQ as asynchronous integration backbone | 2 |
| [004](./004-orchestration-and-choreography.md) | Orchestration for critical dispatch; choreography for side effects | 2–3 |
| [005](./005-phase-1-synchronous-gateway.md) | Synchronous Gateway → Order boundary in foundation | 1 |
| [006](./006-phase-2-direct-event-publication.md) | Direct publication accepted only as a temporary Phase 2 constraint | 2 |
| [007](./007-cqrs-dispatch-service.md) | CQRS applied selectively to Dispatch | 2 |
| [008](./008-transactional-outbox-and-inbox.md) | Transactional Outbox + Consumer Inbox | 3 |
| [009](./009-driver-reservation-locking.md) | PostgreSQL locking for reservation correctness | 3 |
| [010](./010-bounded-retry-and-dlq.md) | Bounded RabbitMQ retries + DLQ | 3 |
| [011](./011-bullmq-dispatch-timeout.md) | BullMQ for delayed assignment timeout | 3 |
| [012](./012-saga-compensation.md) | Saga compensation instead of distributed transactions | 3 |
| [013](./013-tracking-data-hot-and-durable.md) | Redis hot location + durable PostGIS history | 4 |
| [014](./014-dispatch-owns-driver-scoring.md) | Dispatch owns scoring; Driver owns reservation validity | 4 |
| [015](./015-websocket-tracking-ingestion.md) | Socket.IO for live tracking ingestion | 4 |
| [016](./016-opentelemetry-observability-boundary.md) | OpenTelemetry as tracing boundary | 5 |
| [017](./017-kubernetes-stateless-workloads.md) | Kubernetes owns stateless application workloads | 5 |
| [018](./018-delivery-quality-gates.md) | CI/CD quality gates before publication | 5 |
| [019](./019-circuit-breaker-for-synchronous-dependencies.md) | Circuit breaker for synchronous Dispatch dependencies | 6 |
| [020](./020-keda-queue-depth-autoscaling.md) | Optional KEDA queue-depth autoscaling | 6 |
| [021](./021-performance-budgets-before-optimization.md) | Performance budgets before optimization | 6 |
| [022](./022-paired-insertion-routing-baseline.md) | Paired insertion as bounded route-planning baseline | 6 |

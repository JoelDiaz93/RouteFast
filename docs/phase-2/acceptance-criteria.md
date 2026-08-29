# Phase 2 Acceptance Criteria

Phase 2 is complete when:

- [x] Driver Service is independently deployable and owns its PostgreSQL database.
- [x] Dispatch Service is independently deployable and owns its PostgreSQL database.
- [x] RabbitMQ connects Order, Dispatch and Driver services asynchronously.
- [x] Dispatch uses NestJS CQRS command/query buses for workflow orchestration and reads.
- [x] Event contracts are explicitly named and versioned.
- [x] API Gateway exposes driver and dispatch read/management endpoints without database access.
- [x] Correlation IDs survive the synchronous-to-asynchronous transition.
- [x] Each service has health/readiness endpoints.
- [x] Docker Compose provides three databases plus RabbitMQ Management.
- [x] Unit tests cover Order, Driver and Dispatch domain behavior.
- [x] Known reliability gaps are documented instead of hidden.

Phase 2 does **not** claim:

- exactly-once delivery;
- concurrency-safe driver reservation;
- atomic database/event publication;
- automatic retries / DLQ replay;
- Saga compensation beyond the initial orchestration skeleton.

Those are Phase 3 goals.

# Phase 1 — Acceptance Criteria

Phase 1 is complete when the following foundation is present.

## Architecture

- [x] API Gateway and Order Service are separate NestJS applications.
- [x] Order Service has domain, application, infrastructure and interface boundaries.
- [x] Domain code has no NestJS/TypeORM imports.
- [x] Persistence is accessed through an application repository port.
- [x] Order Service owns the orders database model.

## Functional

- [x] Create order.
- [x] Read order by ID.
- [x] List orders.
- [x] Cancel a pending order.
- [x] Validate coordinates and required fields.
- [x] Return a conflict for invalid state transitions.

## Operational

- [x] Gateway health endpoint.
- [x] Order Service health endpoint.
- [x] Correlation ID generated/accepted by Gateway.
- [x] Correlation ID forwarded to Order Service.
- [x] PostgreSQL available through Docker Compose.

## Quality

- [x] Domain transition tests.
- [x] Create-order use-case test.
- [x] TypeScript strict mode.
- [x] Architecture/scope documentation.
- [x] ADRs for foundational distributed-system decisions.

## Explicitly deferred

The following are not Phase 1 defects:

- RabbitMQ missing;
- Driver Service missing;
- Dispatch Service missing;
- Redis missing;
- PostGIS missing;
- Saga/Outbox/Inbox missing;
- WebSockets missing;
- Kubernetes/AWS missing.

They belong to later roadmap phases and must not be rushed into Foundation.

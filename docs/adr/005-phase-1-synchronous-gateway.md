# ADR-005 — Synchronous HTTP Between Gateway and Order Service in Phase 1

**Status:** Accepted

## Context

The public API needs an immediate response when an order is created, queried or cancelled. RabbitMQ is planned for asynchronous workflow progression, but introducing it before any downstream workflow exists would add infrastructure without solving a Phase 1 problem.

## Decision

The API Gateway communicates with Order Service synchronously over HTTP during Phase 1.

The gateway propagates `x-correlation-id` so the request can already be followed across process boundaries.

## Consequences

### Positive

- simple failure semantics for the first vertical slice;
- validates independent applications and network boundaries;
- introduces correlation before full tracing;
- avoids pretending all communication should be event-driven.

### Negative

- Gateway availability for order operations currently depends on Order Service availability.

## Evolution

RabbitMQ is introduced in Phase 2 for integration events and workflow progression. The create-order request may remain synchronous while downstream dispatch begins asynchronously after reliable event publication.

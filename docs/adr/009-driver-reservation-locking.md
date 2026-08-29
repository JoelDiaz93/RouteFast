# ADR-009 — PostgreSQL Row Locking for Driver Capacity

## Context

Multiple Driver Service workers can process reservation requests concurrently.

## Decision

Use the Driver database as the capacity authority and reserve inside a PostgreSQL transaction with a pessimistic write lock / `SKIP LOCKED` candidate selection.

## Alternatives

- Redis distributed lock;
- optimistic version retry only;
- single-threaded reservation worker.

## Consequences

Correctness is tied to the authoritative data store rather than a secondary lock service. Redis remains available for future GEO/caching workloads instead of becoming a second source of truth for capacity.

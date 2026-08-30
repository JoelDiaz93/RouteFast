# ADR-013 — Circuit breaker for synchronous Dispatch dependencies

## Context

Dispatch synchronously queries Driver and Tracking during candidate selection. Repeated failures can consume sockets, latency budgets and worker capacity.

## Decision

Protect these infrastructure clients with a CLOSED/OPEN/HALF_OPEN circuit breaker. Count network errors, timeouts and 5xx as dependency failures; do not count 4xx business/client errors.

## Consequences

- failures are bounded faster during dependency incidents;
- circuit behavior is observable in Prometheus;
- application/domain code stays independent of resilience technology;
- callers must accept fast 503-style failure while a circuit is open.

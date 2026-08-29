# ADR-010 — Bounded RabbitMQ Retry and DLQ

## Decision

A failed integration event is copied to a TTL retry queue. After a bounded retry count it is copied to a final DLQ.

## Consequences

- poison messages do not block the main queue forever;
- retry behavior is visible and configurable;
- DLQ replay remains an operator workflow to be implemented later.

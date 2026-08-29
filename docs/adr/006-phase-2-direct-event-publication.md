# ADR-006 — Direct event publication is temporary in Phase 2

## Status
Accepted as a temporary implementation constraint.

## Context
Phase 2 must demonstrate real RabbitMQ integration. Publishing after a successful database save creates a dual-write window: the database may commit while the broker publish fails.

## Decision
Use direct publication in Phase 2 so service decomposition and event contracts can be exercised end-to-end. Make the limitation explicit in code and documentation.

## Consequences
Positive:
- event-driven workflow becomes executable now;
- integration boundaries can be validated before reliability machinery is added.

Negative:
- state and event publication are not atomic;
- an order may be stored without a corresponding dispatch event if RabbitMQ is unavailable.

## Follow-up
Phase 3 replaces this mechanism with a Transactional Outbox and Consumer Inbox.

# ADR-008 — Transactional Outbox and Consumer Inbox

## Context

A database transaction and RabbitMQ publication cannot be committed atomically using the Phase 2 implementation.

## Decision

Persist integration-event intent in an Outbox table within the same local database transaction as business state. Publish asynchronously. Track successfully handled `eventId` values in a Consumer Inbox.

## Consequences

- removes the lost-event dual-write window;
- delivery remains at-least-once;
- consumers must be idempotent;
- operational cleanup/retention for Outbox and Inbox will be required later.

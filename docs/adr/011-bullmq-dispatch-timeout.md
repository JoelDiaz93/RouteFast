# ADR-011 — BullMQ for Delayed Dispatch Timeout

## Context

Driver assignment has a time boundary but RabbitMQ is used primarily as the integration backbone.

## Decision

Use BullMQ + Redis for delayed internal jobs such as assignment expiration. Keep RabbitMQ for cross-service domain/integration events.

## Consequences

Each tool has a distinct role: RabbitMQ for service integration, BullMQ for scheduled local work.

# ADR-002 — Database Ownership per Bounded Context

**Status:** Accepted

## Context

Microservices lose autonomy if they query or modify each other's tables directly.

## Decision

Every service owns its persistence model. Cross-service database access is forbidden.

In Phase 1 only Order Service exists, so one PostgreSQL database is used. Later services will receive logically/physically separate databases or schemas with independent ownership credentials.

## Consequences

- distributed workflows require explicit contracts and eventual consistency;
- joins across bounded contexts cannot be implemented by directly joining service tables;
- service boundaries remain enforceable;
- future Outbox/Inbox state belongs to the service that owns the corresponding transaction/consumer.

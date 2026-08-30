# ADR-014 — Dispatch owns driver scoring; Driver owns reservation correctness

## Context

Distance, SLA and product priority influence assignment preference, while capacity and reservation invariants belong to Driver Service.

## Decision

Dispatch Service queries capacity candidates and fresh geo candidates, computes an explainable ranking, persists the decision, then sends ranked driver IDs to Driver Service.

Driver Service attempts reservation in that order under its existing PostgreSQL locks.

## Consequences

- business selection policy can evolve independently from capacity enforcement;
- Driver Service does not depend on Tracking Service;
- Dispatch temporarily depends synchronously on Driver and Tracking HTTP availability;
- Phase 5 must add observability and resilience around these synchronous dependencies.

# ADR-015 — Socket.IO for live driver tracking ingestion

## Context

Driver positions are continuous and clients/operators benefit from server push. Repeated REST polling is wasteful for live movement.

## Decision

Tracking Service exposes a Socket.IO namespace for location updates and subscriptions. A REST ingestion endpoint remains available for diagnostics and simple integration tests.

## Consequences

- the service supports bidirectional real-time updates and room-based fan-out;
- WebSocket authentication/authorization becomes a Phase 5 security requirement;
- Kubernetes ingress must later be configured for WebSocket upgrades.

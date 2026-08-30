# ADR-013 — Split live tracking into a hot Redis path and durable PostGIS history

## Context

GPS updates are frequent and latency-sensitive. Using PostgreSQL as the only current-location lookup would couple dispatch latency to a write-heavy historical store.

## Decision

Tracking Service owns both representations:

- Redis GEO for current low-latency candidate discovery;
- PostGIS for durable spatial history and authoritative historical queries.

BullMQ decouples the WebSocket acknowledgement from durable history writes.

## Consequences

- current location is eventually durable;
- Redis can be rebuilt from future updates / latest durable state;
- Dispatch must never access Redis directly; it calls Tracking Service;
- stale-location TTL and age filtering become explicit business/operational concepts.

# Phase 4 Acceptance Criteria

- [ ] Tracking Service starts and `/health/ready` confirms PostGIS.
- [ ] WebSocket driver updates are acknowledged.
- [ ] Redis GEO returns a recently updated driver near a pickup.
- [ ] Stale positions are excluded from dispatch candidates.
- [ ] BullMQ persists GPS history to PostGIS.
- [ ] Driver Service exposes available capacity candidates.
- [ ] Dispatch ranks candidates deterministically using `geo-score-v1`.
- [ ] Dispatch persists the complete score decision for inspection.
- [ ] Driver Service reserves in ranked order without losing Phase 3 row-lock safety.
- [ ] Orders with no geo-eligible drivers fail dispatch rather than silently selecting a driver with no location.
- [ ] Existing Phase 3 idempotency, Outbox/Inbox and Saga compensation continue to work.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass in the local environment.

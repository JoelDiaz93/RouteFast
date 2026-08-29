# Phase 3 Acceptance Criteria

Phase 3 is complete when:

- [x] business state and integration-event intent are committed atomically through a local Outbox;
- [x] all integration events carry an `eventId` and `correlationId`;
- [x] consumers track processed event IDs through an Inbox;
- [x] order creation supports an idempotency key;
- [x] a driver capacity row cannot be concurrently mutated by two reservation transactions;
- [x] duplicate concurrent reservation work for one order cannot reserve two different drivers;
- [x] consumer failures use bounded retry queues;
- [x] exhausted events are moved to a DLQ;
- [x] dispatch assignment has a delayed timeout via BullMQ/Redis;
- [x] an assigned dispatch can execute an explicit Saga compensation;
- [x] late successful reservations after timeout are compensated;
- [x] domain behavior for driver idempotency and dispatch compensation is covered by tests;
- [x] reliability decisions are documented through ADRs.

Phase 3 does **not** claim:

- exactly-once messaging;
- geospatial candidate ranking;
- production observability;
- Kubernetes/AWS deployment;
- DLQ operator replay UI/API.

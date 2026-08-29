# Phase 3 Event Catalog

All events carry `eventId` and `correlationId`.

| Event | Producer | Consumer | Purpose |
|---|---|---|---|
| `order.ready_for_dispatch.v1` | Order | Dispatch | Start dispatch workflow |
| `dispatch.started.v1` | Dispatch | Order | Reflect dispatch progress |
| `driver.reservation_requested.v1` | Dispatch | Driver | Reserve capacity |
| `driver.reserved.v1` | Driver | Dispatch | Reservation succeeded |
| `driver.reservation_failed.v1` | Driver | Dispatch | No reservation available |
| `dispatch.assigned.v1` | Dispatch | Order | Attach assigned driver |
| `dispatch.failed.v1` | Dispatch | Order | Restore order after failed dispatch |
| `driver.release_requested.v1` | Dispatch | Driver | Saga compensation |
| `driver.released.v1` | Driver | Dispatch | Compensation completed at Driver |
| `dispatch.cancelled.v1` | Dispatch | Order | Complete cancellation at Order |

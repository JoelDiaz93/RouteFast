# Phase 2 Integration Event Catalog

Integration events are versioned independently from domain entities. Payloads are intentionally small and consumers must not reach into another service's database.

| Pattern | Producer | Consumer | Purpose |
|---|---|---|---|
| `order.ready_for_dispatch.v1` | Order Service | Dispatch Service | Starts a dispatch workflow after order creation. |
| `dispatch.started.v1` | Dispatch Service | Order Service | Moves the order to `DISPATCHING`. |
| `driver.reservation_requested.v1` | Dispatch Service | Driver Service | Requests one available driver reservation. |
| `driver.reserved.v1` | Driver Service | Dispatch Service | Confirms the selected driver. |
| `driver.reservation_failed.v1` | Driver Service | Dispatch Service | Indicates no driver could be reserved. |
| `dispatch.assigned.v1` | Dispatch Service | Order Service | Completes order assignment. |
| `dispatch.failed.v1` | Dispatch Service | Order Service | Returns the order to pending dispatch with a failure reason. |

## Correlation

Every integration payload contains `correlationId`. The same value begins at API Gateway and follows the asynchronous workflow.

## Versioning rule

Breaking schema changes require a new event pattern such as `.v2`. Consumers can migrate independently.

## Deliberate Phase 2 limitation

Events are published directly after local persistence. This demonstrates asynchronous integration but does **not** yet guarantee atomic state + event persistence. ADR-006 documents the gap; Phase 3 introduces Transactional Outbox and Consumer Inbox.

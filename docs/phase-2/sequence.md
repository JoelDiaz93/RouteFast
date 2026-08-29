# Phase 2 Dispatch Sequence

```text
Client
  │ POST /orders
  ▼
API Gateway
  │ HTTP + correlationId
  ▼
Order Service
  │ save Order(PENDING_DISPATCH)
  │
  └── order.ready_for_dispatch.v1 ──────────────┐
                                                ▼
                                         Dispatch Service
                                         CQRS CommandBus
                                                │
                                      save Dispatch(SEARCHING)
                                                │
                ┌── dispatch.started.v1 ─────────┤
                │                               │
                ▼                               └── driver.reservation_requested.v1
          Order Service                                        │
          DISPATCHING                                           ▼
                                                        Driver Service
                                                        select candidate
                                                        reserve driver
                                                             │
                                  driver.reserved.v1 ─────────┘
                                                             │
                                                             ▼
                                                      Dispatch Service
                                                      ASSIGNED
                                                             │
                                       dispatch.assigned.v1 ──┘
                                                             │
                                                             ▼
                                                       Order Service
                                                       ASSIGNED
```

Failure path when no driver exists:

```text
driver.reservation_requested.v1
            ↓
Driver Service
            ↓
NO_AVAILABLE_DRIVER
            ↓
driver.reservation_failed.v1
            ↓
Dispatch Service = FAILED
            ↓
dispatch.failed.v1
            ↓
Order Service = PENDING_DISPATCH
```

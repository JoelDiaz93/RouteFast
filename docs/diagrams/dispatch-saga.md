# Dispatch Saga

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant G as API Gateway
  participant O as Order Service
  participant Q as RabbitMQ
  participant D as Dispatch Service
  participant R as Driver Service

  C->>G: POST /orders
  G->>O: create order + Idempotency-Key
  O->>O: TX: order + outbox event
  O-->>G: accepted order
  G-->>C: 2xx

  O->>Q: order.ready_for_dispatch.v1
  Q->>D: consume
  D->>D: create dispatch / SEARCHING_DRIVER
  D->>Q: driver.reservation_requested.v1
  Q->>R: consume
  R->>R: advisory lock(orderId)
  R->>R: row lock + capacity invariant
  R->>Q: driver.reserved.v1
  Q->>D: consume
  D->>D: ASSIGNED
  D->>Q: dispatch.assigned.v1
  Q->>O: consume
  O->>O: ASSIGNED

  alt assignment timeout / operator cancellation
    D->>Q: driver.release_requested.v1
    Q->>R: compensate reservation
    R->>Q: driver.released.v1
    Q->>D: complete compensation
    D->>Q: dispatch.cancelled.v1
    Q->>O: cancel order
  end
```

The workflow is eventually consistent across services. Correctness comes from local ACID transactions, idempotent consumers, Outbox/Inbox and compensating actions—not a distributed database transaction.

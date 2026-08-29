# RouteFast Bounded Contexts

This document defines business ownership before service implementation.

## Context map

```text
Order Management ──order.ready_for_dispatch──► Dispatch
                                                │
                                                ├──queries/commands──► Driver/Fleet
                                                ├──queries───────────► Routing
                                                └──events────────────► Delivery Execution

Driver/Fleet ──availability events────────────► Dispatch
Tracking ──position/ETA signals───────────────► Operations / SLA
Delivery Execution ──lifecycle events────────► Notification / Audit
```

---

## 1. Order Management

### Responsibility

Represents the delivery request before and during fulfillment.

### Owns

- `OrderId`
- customer reference
- pickup
- dropoff
- priority
- order status
- cancellation rules

### Invariants

- pickup and dropoff coordinates must be valid;
- an order cannot transition from a terminal state back into an active state;
- an order cannot be cancelled after a future business rule marks execution as irreversible.

### Does not own

- driver availability;
- driver assignment;
- route/ETA calculation;
- live location.

---

## 2. Driver / Fleet

### Responsibility

Represents driver eligibility, operational availability and carrying capacity.

### Owns

- `DriverId`
- availability
- capacity
- current workload
- assignment eligibility
- reservation version

### Critical future invariant

> Available capacity cannot be reserved twice under concurrent dispatch attempts.

---

## 3. Dispatch

### Responsibility

Coordinates the decision and workflow that connects an order to a driver.

### Owns

- `DispatchId`
- candidate set
- scoring result
- reservation/assignment workflow
- attempt count
- timeout/retry policy
- Saga state

### Does not own

Order or Driver master data.

Dispatch references their identities and reacts to their contracts/events.

---

## 4. Delivery Execution

### Responsibility

Represents execution after an assignment has been accepted.

### Owns

- delivery lifecycle
- pickup confirmation
- in-transit state
- delivery completion/failure
- operational timestamps

---

## 5. Tracking

### Responsibility

High-frequency location ingestion and live tracking semantics.

### Owns

- latest accepted driver position
- ordering/timestamp policy for GPS updates
- tracking subscriptions
- ephemeral position cache

### Important distinction

Tracking is intentionally separated from Driver/Fleet because its throughput, storage and real-time characteristics differ significantly from driver master/availability data.

---

## 6. Routing

### Responsibility

Provides route and ETA capabilities without exposing a vendor directly to the rest of the platform.

### Owns

- routing provider adapter
- timeout/retry/fallback policy
- route/ETA response contract

---

## 7. Notification

### Responsibility

Processes notification requests asynchronously.

A notification failure must not roll back a completed delivery.

---

## 8. Operations / Audit

### Responsibility

Provides traceability and operational visibility without becoming the owner of transactional business state.

Future data may include:

- event timeline;
- DLQ inspection;
- service/queue health;
- SLA risk projections;
- correlated delivery traces.


# RouteFast — Project Scope and Boundaries

This document prevents RouteFast from becoming an uncontrolled "everything platform". Features are accepted only when they reinforce the last-mile logistics domain or demonstrate a deliberate engineering capability.

## Product statement

RouteFast is a **last-mile logistics orchestration platform** responsible for coordinating delivery orders, dispatching drivers, tracking execution, and exposing operational state.

It is not an e-commerce marketplace, accounting suite, ERP, or social application.

---

## In scope

### Core business capabilities

1. Order intake and lifecycle
2. Driver availability and capacity
3. Dispatch and assignment
4. Route/ETA integration
5. Delivery execution
6. Real-time location tracking
7. SLA monitoring
8. Notifications
9. Operational audit and troubleshooting

### Engineering capabilities

1. REST APIs
2. service decomposition
3. event-driven integration
4. workflow orchestration
5. concurrency control
6. idempotency
7. eventual consistency
8. geospatial search
9. resilience
10. observability
11. horizontal scaling
12. automated testing and delivery

---

## Explicit non-goals

The following are excluded unless a later requirement proves they are necessary:

- full e-commerce catalog;
- customer checkout/payment gateway;
- payroll;
- accounting ledger;
- warehouse management system;
- advanced machine-learning route optimization;
- native mobile apps;
- production-grade maps licensing;
- multi-region active/active deployment in the initial roadmap;
- blockchain;
- generative AI features that do not improve dispatch/logistics operations.

---

## Service boundary rules

### 1. No shared database

A service may never query another service's tables directly.

### 2. No shared domain model

Shared TypeScript packages may contain technical utilities or public message/API contracts, but not business entities such as `Order`, `Driver`, or `Delivery`.

### 3. A service owns its invariants

Examples:

- Order Service owns order state validity.
- Driver Service owns driver capacity and availability.
- Dispatch owns assignment workflow and orchestration state.
- Tracking owns live location ingestion semantics.

### 4. Synchronous communication is not the default

Use HTTP when an immediate response is required. Use events when downstream work can occur independently.

### 5. Eventual consistency is explicit

The project will not hide distributed consistency behind cross-service transactions.

---

## Initial domain limits

### Order Management

Owns:
- order identity;
- pickup/dropoff information;
- priority;
- customer reference;
- order lifecycle.

Does not own:
- driver selection;
- route calculation;
- GPS tracking.

### Dispatch

Owns:
- assignment orchestration;
- candidate evaluation;
- temporary reservation workflow;
- retry/reassignment policy.

Does not own:
- driver master data;
- order master data.

### Driver/Fleet

Owns:
- driver identity;
- availability;
- capacity;
- assignment eligibility.

### Tracking

Owns:
- live positions;
- GPS event acceptance and ordering policy;
- tracking subscriptions.

### Routing

Owns:
- route/ETA abstraction;
- external routing provider integration;
- fallback behavior.

### Notification

Owns:
- asynchronous communication requests;
- retry/DLQ behavior for notification delivery.

---

## Definition of "done" for a new capability

A feature is not complete until it has:

- a documented owner/bounded context;
- explicit invariants;
- API/event contract;
- error/failure behavior;
- automated tests;
- logging/correlation information;
- documentation if it introduces a new architectural decision.


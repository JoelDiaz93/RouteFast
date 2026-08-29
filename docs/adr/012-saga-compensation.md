# ADR-012 — Saga Compensation Instead of Distributed Transactions

## Context

Cancelling an assigned dispatch affects Dispatch, Driver and Order data owned by separate services.

## Decision

Dispatch Service orchestrates compensation through events: release driver capacity, wait for confirmation, then cancel Dispatch and notify Order.

## Consequences

Intermediate states are explicit (`COMPENSATING`). The system accepts eventual consistency rather than introducing a distributed database transaction.

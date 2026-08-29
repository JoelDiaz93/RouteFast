# RouteFast Phase 2 — Event-Driven Services

Phase 2 evolves RouteFast from a clean single vertical slice into a real distributed workflow.

## Added services

- **Driver Service** — owns driver availability and reservation state.
- **Dispatch Service** — owns dispatch workflow state and orchestrates assignment.

## Infrastructure

- RabbitMQ with Management UI (`localhost:15672`)
- independent Order, Driver and Dispatch PostgreSQL databases
- hybrid NestJS HTTP + RMQ microservice processes

## Main workflow

`Order -> RabbitMQ -> Dispatch -> RabbitMQ -> Driver -> RabbitMQ -> Dispatch -> RabbitMQ -> Order`

Dispatch uses NestJS CQRS to keep workflow commands separate from operational queries.

## Engineering value

This phase demonstrates:

- service decomposition by bounded context;
- database ownership;
- asynchronous integration;
- RabbitMQ manual acknowledgements;
- versioned integration events;
- correlation propagation;
- selective CQRS;
- orchestration without shared domain objects.

## Known gaps intentionally left for Phase 3

1. direct DB + broker dual write;
2. non-atomic driver candidate reservation under concurrent consumers;
3. no Inbox deduplication;
4. no retry topology / DLQ replay tooling;
5. no assignment timeout or compensation worker.

These are not hidden defects: they define the reliability work for Phase 3.

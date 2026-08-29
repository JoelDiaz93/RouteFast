# Phase 3 Manual Test

## Start infrastructure

```bash
cp .env.example .env
npm install
docker compose up -d
```

Start the four NestJS applications in separate terminals.

## Idempotent order creation

Send the same request twice with the same header:

```http
Idempotency-Key: demo-order-001
```

Expected: both calls represent the same persisted order and only one initial dispatch intent is created.

## Concurrent driver reservation

1. Create one driver with capacity `1`.
2. Create multiple orders close together.
3. Observe that a single driver row cannot contain more reservations than its capacity.
4. Inspect Driver DB `outbox_events` and Dispatch state.

## Retry / DLQ

Temporarily make a consumer handler fail or stop a required dependency. Failed RabbitMQ messages are copied to `<queue>.retry`; after configured attempts they are moved to `<queue>.dlq`.

## Assignment timeout

Set:

```env
DISPATCH_ASSIGNMENT_TIMEOUT_MS=5000
```

Create an order without a usable driver. After the delayed BullMQ job executes, the dispatch should move to `FAILED` with `ASSIGNMENT_TIMEOUT` if it is still searching.

## Saga compensation

After a dispatch becomes `ASSIGNED`:

```http
POST /api/v1/dispatches/{dispatchId}/cancel
Content-Type: application/json

{ "reason": "OPERATOR_TEST" }
```

Expected final state:

- Driver reservation released;
- Dispatch `CANCELLED`;
- Order `CANCELLED`.

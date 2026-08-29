# Phase 2 Manual Test

## 1. Start infrastructure

```bash
cp .env.example .env
npm install
docker compose up -d
```

RabbitMQ Management:

- URL: `http://localhost:15672`
- user: `routefast`
- password: `routefast`

## 2. Start services

Run each process in a separate terminal:

```bash
npm run start:order
npm run start:driver
npm run start:dispatch
npm run start:gateway
```

## 3. Happy path

1. Create a driver with `POST /api/v1/drivers`.
2. Create an order with `POST /api/v1/orders`.
3. Poll `GET /api/v1/orders` until the order becomes `ASSIGNED`.
4. Read `GET /api/v1/dispatches` and verify the dispatch points to the same `driverId`.
5. Read `GET /api/v1/drivers` and verify the order appears in `reservedOrderIds`.

Expected state convergence:

```text
Order     PENDING_DISPATCH -> DISPATCHING -> ASSIGNED
Dispatch  SEARCHING_DRIVER ----------------> ASSIGNED
Driver    AVAILABLE ------------------------> RESERVED (when capacity is full)
```

## 4. No-driver path

With no AVAILABLE driver, create an order.

Expected convergence:

```text
Dispatch = FAILED
failureReason = NO_AVAILABLE_DRIVER

Order = PENDING_DISPATCH
lastDispatchFailureReason = NO_AVAILABLE_DRIVER
```

## 5. Correlation

Send a custom `x-correlation-id` in the order request and verify the same value is stored in the Dispatch row and appears in integration event payloads.

## 6. Known failure experiment

Stop RabbitMQ and create an order.

The Order database commit can succeed while event publication fails. This is an intentional Phase 2 experiment demonstrating the dual-write problem. Phase 3 will replace direct publication with Transactional Outbox.

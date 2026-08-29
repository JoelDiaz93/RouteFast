# Reliability Flow

## Transactional Outbox

The service does not publish RabbitMQ messages from the business transaction directly.

```text
BEGIN
  UPDATE/INSERT domain state
  INSERT outbox_event
COMMIT
```

A background worker polls pending outbox rows and publishes them. Publication can happen more than once if a process crashes between broker confirmation and marking the row `PUBLISHED`; therefore duplicate delivery is part of the design.

## Consumer Inbox

Every integration event carries an `eventId`.

After successful processing, the consumer stores that ID as `PROCESSED`. A repeated event ID does not execute the business effect again.

The Inbox is not presented as "exactly once messaging". RouteFast uses at-least-once delivery plus idempotent business operations.

## Why this architecture

The pattern addresses the Phase 2 dual-write failure:

```text
DB commit ✓
RabbitMQ publish ✕
```

With Outbox, the durable event intent is committed together with business state and can be retried later.

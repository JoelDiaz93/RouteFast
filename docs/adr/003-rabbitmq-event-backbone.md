# ADR-003 — RabbitMQ as the Asynchronous Integration Backbone

**Status:** Accepted for Phase 2+

## Context

Dispatch workflows contain retryable work, independent consumers, delayed/failure scenarios, and operations that do not require an immediate synchronous response.

## Decision

Use RabbitMQ for inter-service asynchronous messaging.

Use HTTP only when the caller requires an immediate authoritative response.

## Delivery model

Design consumers for **at-least-once delivery**.

This implies future implementation of:

- idempotent handlers;
- message IDs;
- Consumer Inbox;
- Transactional Outbox;
- retry queues;
- dead-letter queues.

## Why not Kafka initially?

RouteFast is primarily modeling command/workflow messaging, retries and routing between operational services. RabbitMQ offers a simpler fit for those initial requirements. Kafka may be evaluated later for high-volume event streaming/analytics, but it is not required to prove the core dispatch architecture.

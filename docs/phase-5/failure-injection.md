# Phase 5 — Failure injection scenarios

The goal is not chaos for its own sake. Each scenario has a diagnostic question and an expected system property.

## 1. RabbitMQ outage

```powershell
docker stop routefast-rabbitmq
# Create an order while the broker is unavailable.
# Observe pending Outbox rows and logs/traces.
docker start routefast-rabbitmq
```

Expected: the business transaction remains committed, the Outbox worker retries, and events are published after RabbitMQ recovers.

## 2. Tracking dependency outage during dispatch

```powershell
docker stop routefast-tracking-postgis
```

Expected: Tracking readiness becomes unhealthy. Dispatch should surface dependency failure rather than inventing a geo candidate. Jaeger should show where latency/error originates.

## 3. Redis outage

```powershell
docker stop routefast-redis
```

Expected: real-time/GEO operations fail visibly; durable PostGIS data is not silently substituted for a stale hot-path contract.

## 4. Poison RabbitMQ message

Publish an invalid integration payload to a RouteFast queue from RabbitMQ Management. Expected: bounded retries, then DLQ. The message must not loop forever.

## Diagnostic workflow

For every failure:

1. locate the request by `correlationId`;
2. find the matching distributed trace in Jaeger;
3. inspect service logs for the same `traceId` / correlation ID;
4. inspect Prometheus/Grafana for latency/error changes;
5. inspect RabbitMQ queue/DLQ state when messaging is involved.

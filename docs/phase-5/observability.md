# Phase 5 — Observability

RouteFast uses three complementary signals instead of treating "logging" as observability:

1. **Traces** — OpenTelemetry auto-instrumentation exports OTLP traces to the collector. HTTP/Axios and supported messaging libraries propagate trace context where possible.
2. **Metrics** — each NestJS process exposes Prometheus metrics. The first dashboard focuses on request rate, p95 latency, and 5xx rate.
3. **Structured logs** — Nest lifecycle logs and HTTP completion logs are JSON. HTTP logs include `correlationId` and the active OpenTelemetry `traceId` when present.

## Local stack

```bash
docker compose --profile observability up -d
```

Then start the five applications. Endpoints:

- Jaeger: http://localhost:16686
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3005 (`routefast` / `routefast`)
- OTLP HTTP collector: http://localhost:4318

Metrics:

- Gateway: http://localhost:3000/api/v1/metrics
- Order: http://localhost:3001/metrics
- Driver: http://localhost:3002/metrics
- Dispatch: http://localhost:3003/metrics
- Tracking: http://localhost:3004/metrics

## Correlation vs tracing

`x-correlation-id` remains a business/operations correlation key that RouteFast controls. `traceId` belongs to the distributed tracing system. They are intentionally separate and both may be queried when diagnosing an incident.

# ADR-016 — OpenTelemetry as the tracing boundary

## Status
Accepted — Phase 5

## Context
RouteFast needs end-to-end diagnosis across HTTP calls, background work and asynchronous service boundaries without coupling domain code to Jaeger, AWS X-Ray or another vendor backend.

## Decision
Use the OpenTelemetry Node SDK at process bootstrap and export OTLP to a collector. Keep `x-correlation-id` as an explicit RouteFast operations identifier in parallel with the trace ID.

## Consequences

- observability backend can change without changing domain/application code;
- local Jaeger and AWS X-Ray can share the same instrumentation boundary;
- supported library auto-instrumentation reduces manual span boilerplate;
- business identifiers should still be added as span/log attributes where operationally useful;
- tracing is not treated as a replacement for metrics or logs.

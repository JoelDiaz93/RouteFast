# Phase 6 — Circuit breaker

Dispatch depends synchronously on Driver Service for capacity candidates and Tracking Service for geospatial candidates. Timeouts prevent indefinite waits, but repeated dependency failures can still amplify an incident.

Phase 6 adds an infrastructure-only circuit breaker around these two calls.

```text
CLOSED
  │ consecutive dependency failures
  ▼
OPEN ── short-circuit calls
  │ reset timeout
  ▼
HALF_OPEN
  │ success       failure
  ├──────────→ CLOSED
  └──────────→ OPEN
```

HTTP 4xx responses do not count as infrastructure failures. Network failures, timeouts and 5xx responses do.

Prometheus exposes state, transitions, dependency calls and dependency latency. Domain/application layers do not import circuit-breaker code.

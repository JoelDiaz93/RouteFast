# RouteFast local performance baseline — v0.6.5

## Scope

This is a **local development baseline**, not a maximum-capacity or production SLA claim. The objective is to establish a reproducible reference before progressive stress testing.

Measured with:

- RouteFast v0.6.5 compiled NestJS processes;
- Node.js v24.19.0;
- k6 v2.2.0 from the pinned Docker image;
- Docker-hosted PostgreSQL/PostGIS, RabbitMQ, Redis and observability stack;
- Windows host;
- all five readiness probes healthy before each run.

Host CPU/RAM were not captured in the original baseline run, so the numbers should not be compared directly with a different machine.

## Smoke profile

3 VUs for 30 seconds against order creation.

| Metric | Result | Budget |
|---|---:|---:|
| HTTP requests | 331 | — |
| Checks | 330/330 passed | 100% |
| Error rate | **0.00%** | < 1% |
| Avg latency | 23.17 ms | — |
| p95 | **45.27 ms** | < 500 ms |
| p99 | **73.88 ms** | < 1000 ms |
| Max | 108.60 ms | — |

## Idempotency profile

25 iterations, 5 VUs, 5 concurrent duplicate order requests per iteration.

| Metric | Result | Budget |
|---|---:|---:|
| HTTP requests | 126 | — |
| Duplicate consistency checks | **50/50 passed** | 100% |
| Error rate | **0.00%** | < 1% |
| Avg latency | 77.66 ms | — |
| p95 | **118.36 ms** | < 750 ms |
| Max | 175.57 ms | — |

Validated business property: every duplicate batch succeeded and returned one consistent business result for the same idempotency key.

## Mixed profile

60 seconds with two constant-arrival-rate scenarios:

- Orders: **8 iterations/s**.
- GPS tracking: **30 iterations/s**.
- Target total: **38 iterations/s**.

| Metric | Result | Budget |
|---|---:|---:|
| Completed iterations | 2,282 | — |
| HTTP requests | 2,284 | — |
| Iteration throughput | **37.99 iter/s** | target ≈ 38/s |
| HTTP failure rate | **0.00%** | < 2% |
| Dropped iterations | **0** | 0 preferred |
| Overall p95 | 29.07 ms | — |
| Orders p95 | **66.29 ms** | < 600 ms |
| Orders max | 379.78 ms | — |
| Tracking p95 | **17.65 ms** | < 250 ms |
| Tracking max | 142.71 ms | — |

## Interpretation

At this load, RouteFast showed no sustained saturation signal: throughput matched the scheduled workload, all checks passed, no iterations were dropped, and both order and tracking p95 latency remained well below their engineering budgets.

This baseline is the reference for `performance/k6/stress.js`. Do not optimize from these numbers alone; use progressive stress plus Grafana/Jaeger to locate a measured bottleneck first.

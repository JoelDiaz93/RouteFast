# Stress Baseline — v0.6.6

## Purpose

This run intentionally searched for saturation using a progressive arrival-rate profile. It is **not** a production capacity claim.

## Workload

| Level | Orders/s | GPS/s | Total target |
|---|---:|---:|---:|
| 1 | 10 | 40 | 50/s |
| 2 | 20 | 80 | 100/s |
| 3 | 40 | 160 | 200/s |
| 4 | 80 | 320 | 400/s |

Each level contains a 15-second ramp followed by a 45-second hold.

## Observed saturation

The first explicit k6 saturation signal appeared at approximately **138–141 seconds**, immediately after entering the ~200/s target level:

- tracking reached `maxVUs=200`;
- orders reached `maxVUs=120`;
- tracking then began returning EOF/timeouts;
- later both request planes experienced timeouts.

This brackets the next investigation around the transition between the 100/s and 200/s target levels. It does **not** prove that 100/s is the maximum sustainable throughput.

## Whole-run results

| Metric | Observed |
|---|---:|
| HTTP requests | 14,102 |
| Completed iterations | 13,780 |
| Aggregate HTTP request rate | 43.88 req/s |
| HTTP failure rate | 3.80% |
| Dropped iterations | 26,733 |
| Orders p95 | 14.62 s |
| Tracking p95 | 4.19 s |
| Orders max | 67 s |
| Tracking max | 74 s |
| Max active VUs | 320 |

The aggregate request rate is not a maximum-capacity claim; later stages were deeply saturated.

## First controlled hypothesis

Every successful request emits a structured stdout access log in the API Gateway and again in the downstream service. Under a high arrival rate this adds terminal/pipe I/O directly to the hot path. Because the local benchmark runs on Windows through Docker Desktop and `concurrently`, this is a credible source of event-loop contention.

The first targeted optimization is successful-request access-log sampling while preserving all 4xx/5xx logs, Prometheus metrics, OpenTelemetry tracing, and lifecycle/error logs.

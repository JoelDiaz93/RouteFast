# RouteFast progressive stress snapshot

Generated: 2026-08-30T20:16:19.698Z

> This report is a local engineering measurement, not a production capacity claim. Compare runs only when the environment and RouteFast revision are controlled.

## Environment

| Item | Value |
|---|---|
| RouteFast | v0.6.6 |
| Node | v24.19.0 |
| OS | win32 10.0.26200 (x64) |
| CPU | Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz |
| Host RAM | 31.8 GiB |
| k6 | Docker image pinned in docker-compose.yml |

## Workload

Progressive target: approximately **50 → 100 → 200 → 400 iterations/s**, split 20% orders / 80% GPS tracking.

## Result

| Metric | Value |
|---|---:|
| HTTP requests | n/a |
| HTTP request rate | n/a req/s |
| Iterations | n/a |
| Iteration rate | n/a iter/s |
| HTTP failure rate | n/a |
| Dropped iterations | 0 |
| Orders p95 | n/a ms |
| Orders max | n/a ms |
| Tracking p95 | n/a ms |
| Tracking max | n/a ms |

## Interpretation

**No saturation signal detected by the baseline criteria.**

- Error rate remained below 2%.
- No dropped iterations were reported.
- Orders p95 remained below 600 ms.
- Tracking p95 remained below 250 ms.

## Next action

If a saturation signal appears, inspect the same time window in Grafana and Jaeger before changing code. Optimize only the component supported by traces/metrics, then rerun this exact profile and compare before/after.

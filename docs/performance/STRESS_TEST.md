# Progressive stress test

## Purpose

`performance/k6/stress.js` is a **saturation finder**. It does not exist to produce a marketing throughput number. It increases the same two ingestion workloads used by the measured v0.6.5 baseline and records when latency, error rate, dropped iterations, queue depth, CPU or memory stop scaling linearly.

## Profile

The profile ramps and then holds four target levels:

| Level | Orders/s | GPS/s | Approx total/s |
|---|---:|---:|---:|
| 1 | 10 | 40 | 50 |
| 2 | 20 | 80 | 100 |
| 3 | 40 | 160 | 200 |
| 4 | 80 | 320 | 400 |

Each level has a short ramp followed by a steady hold. Total runtime is about four minutes plus graceful stop.

The test targets the **ingestion plane** (`POST /orders` and `POST /tracking/locations`). Background dispatch, RabbitMQ, outbox/inbox and persistence continue to run and should be observed, but the test does not claim that every created order reaches a successful driver assignment during the stress window.

## Run

Keep compiled RouteFast services and infrastructure running in one terminal:

```powershell
npm run start:all:no-build
```

From another terminal:

```powershell
npm run load:preflight
npm run load:stress
```

The Docker runner writes raw output to:

```text
performance/results/stress-latest.json
```

and automatically generates:

```text
performance/results/STRESS_LATEST.md
```

Raw JSON is ignored by Git. Curate and commit a Markdown report only when the environment is documented.

## Saturation signals

Treat any of the following as a reason to investigate before increasing load further:

- sustained HTTP error rate >= 2%;
- any repeated dropped iterations;
- Orders p95 >= 600 ms;
- Tracking p95 >= 250 ms;
- RabbitMQ backlog growing after the workload stops;
- PostgreSQL/PostGIS latency rising non-linearly;
- Redis latency or connection errors;
- CPU pegged while queue depth continues rising;
- memory growth that does not recover after load ends.

The k6 test uses wider failure guardrails (`5%`, 1000 ms order p95, 500 ms tracking p95) so it can continue long enough to capture evidence around the knee of the curve.

## Investigation sequence

1. Mark the time window where k6 first shows a saturation signal.
2. Check Grafana HTTP latency/error panels and RabbitMQ queue metrics.
3. Open matching traces in Jaeger using `correlationId` / trace context.
4. Determine whether time is spent in Gateway, Order, Dispatch, Driver, Tracking, PostgreSQL/PostGIS, RabbitMQ or Redis.
5. If traces point to local CPU/heap behavior, run `npm run profile:dispatch` or `npm run profile:tracking`.
6. Make **one targeted optimization**.
7. Rerun the exact same stress profile.
8. Compare before/after on the same host and revision conditions.

## Stop rule

If the 400/s profile completes without a meaningful saturation signal, do not invent another optimization. Record the result and either increase the test in a separate experiment or stop engineering work and move to portfolio/demo presentation.

## v0.6.6 saturation baseline and first optimization

See [STRESS_BASELINE_v0.6.6.md](STRESS_BASELINE_v0.6.6.md). For the controlled before/after run, start services with `npm run start:all:benchmark`; this samples successful access logs at 1% while preserving errors, metrics, and traces. Then rerun the **same** `npm run load:stress` profile.

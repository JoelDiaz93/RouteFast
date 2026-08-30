# Phase 6 — Performance testing

RouteFast uses k6 as an external load generator. Performance budgets become evidence only after execution against a documented environment.

## Profiles

- `performance/k6/smoke.js` — low-volume order smoke under concurrency.
- `performance/k6/idempotency.js` — concurrent duplicate order creation using one idempotency key.
- `performance/k6/mixed-workload.js` — measured baseline: simultaneous order creation and GPS ingestion.
- `performance/k6/stress.js` — progressive saturation finder: approximately 50 → 100 → 200 → 400 iterations/s.

## Default Docker runner

```powershell
npm run load:k6:version
npm run load:smoke
npm run load:idempotency
npm run load:mixed
npm run load:stress
```

Each default load command runs the readiness preflight first. Docker k6 targets `http://host.docker.internal:3000/api/v1` unless `K6_BASE_URL` is overridden.

## Measured baseline

The curated local baseline is stored in [`../performance/BASELINE_v0.6.5.md`](../performance/BASELINE_v0.6.5.md).

The mixed v0.6.5 run sustained approximately 38 iterations/s with 0% HTTP errors and 0 dropped iterations; Orders p95 was 66.29 ms and Tracking p95 was 17.65 ms.

## Progressive stress

`npm run load:stress` saves the raw k6 summary to `performance/results/stress-latest.json` and generates `performance/results/STRESS_LATEST.md` even when k6 exits with a failed threshold. See [`../performance/STRESS_TEST.md`](../performance/STRESS_TEST.md) for the investigation/stop rules.

## Publishing rule

Never present a threshold as an achieved benchmark. A publishable result must include RouteFast revision, runtime, host/container context, workload definition, duration and measured outputs. If a stress signal appears, inspect Grafana/Jaeger before changing code and rerun the exact same profile after one targeted optimization.

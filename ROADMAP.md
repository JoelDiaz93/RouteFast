# RouteFast Roadmap

RouteFast was developed by technical risk rather than by accumulating features.

| Phase | Goal | Status |
|---|---|---|
| 1 | Foundation: DDD/Clean Architecture, Gateway, Order, PostgreSQL | ✅ Complete |
| 2 | Event-driven workflow: Driver, Dispatch, RabbitMQ, CQRS | ✅ Complete |
| 3 | Reliability: Outbox/Inbox, idempotency, concurrency, Saga, retry/DLQ | ✅ Complete |
| 4 | Logistics: PostGIS, Redis GEO, WebSockets, scoring, ETA/SLA | ✅ Complete |
| 5 | Operability: OTel, Prometheus/Grafana, Jaeger, K8s, CI/CD, AWS blueprint | ✅ Complete |
| 6 | Hardening: circuit breaker, profiling, KEDA, route heuristic, k6 | ✅ Complete |
| 6.4–6.5 | Security/runtime hygiene: 0 production audit findings, runtime/load preflights | ✅ Complete |
| 6.6 | Saturation experiment + portfolio evidence structure | 🚧 Stress result pending |

## Current gate

Measured baseline at v0.6.5 is healthy at ~38 mixed iterations/s with 0% HTTP errors and 0 dropped iterations. The next engineering experiment is `npm run load:stress`, ramping approximately 50 → 100 → 200 → 400 iterations/s.

## Decision after stress

- If a repeatable saturation point is found: identify the bottleneck with Grafana/Jaeger, make **one** targeted optimization, rerun the identical profile and document before/after.
- If no meaningful saturation signal is found: stop internal engineering expansion and finalize repository/portfolio presentation.

## Explicitly out of scope unless justified later

- adding microservices only to increase service count;
- replacing RabbitMQ/Redis/PostgreSQL without evidence;
- exact/optimal VRP claims;
- a production multi-region platform;
- large consumer-facing UI as a substitute for backend evidence;
- premature performance tuning without traces/metrics.

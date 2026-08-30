# Phase 6 acceptance criteria

- [ ] TypeScript typecheck passes.
- [ ] Unit tests pass, including circuit breaker and route planner.
- [ ] All five NestJS apps build.
- [ ] Gateway tracking route resolves under the single `/api/v1` global prefix.
- [ ] Dispatch opens its circuit after configured dependency failures and later probes half-open.
- [ ] Circuit state/transition/dependency metrics are exposed.
- [ ] `/api/v1/optimization/route-plan` preserves pickup/dropoff precedence and capacity.
- [ ] k6 smoke, idempotency and mixed profiles are executable.
- [ ] Performance results are reported as measured evidence, not assumed values.
- [ ] Base Kubernetes manifests still validate.
- [ ] KEDA overlay renders without duplicate HPA ownership for Order/Driver/Dispatch.
- [ ] Profiling commands generate artifacts outside version control.

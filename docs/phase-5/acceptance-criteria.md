# Phase 5 Acceptance Criteria

Phase 5 is complete when the following can be demonstrated:

- [ ] all five apps typecheck, test and build;
- [ ] each application exports OpenTelemetry traces to the local collector;
- [ ] Jaeger shows a request crossing at least Gateway → Order and a dispatch flow crossing service boundaries;
- [ ] each HTTP service exposes Prometheus metrics;
- [ ] Grafana renders request rate, p95 latency and 5xx metrics;
- [ ] logs are JSON and an HTTP completion log contains `correlationId` plus `traceId` when a span is active;
- [ ] `/health/live` and `/health/ready` work for every service (gateway paths are under `/api/v1`);
- [ ] five application images build from the generic Dockerfile;
- [ ] `kubectl kustomize k8s/base` renders valid manifests;
- [ ] Kubernetes workloads contain resource requests/limits, probes and HPAs;
- [ ] CI contains typecheck, tests, build, dependency audit, image build and Trivy scanning;
- [ ] CodeQL is enabled;
- [ ] tagged releases can publish independent service images;
- [ ] AWS deployment boundaries are documented without placing AWS SDK code inside domain/application layers;
- [ ] at least one failure-injection scenario is diagnosed using trace + logs + metrics.

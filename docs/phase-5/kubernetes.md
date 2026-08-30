# Phase 5 — Kubernetes operating model

The manifests under `k8s/base` demonstrate stateless RouteFast workloads on Kubernetes. Stateful dependencies are external in the AWS target architecture.

Each application deployment defines:

- two baseline replicas;
- CPU/memory requests and limits;
- liveness and readiness probes;
- Prometheus scrape annotations;
- non-root containers with dropped Linux capabilities;
- HPA from 2 to 8 replicas at 70% target CPU.

The HPA demonstrates horizontal scalability; it is not a claim that CPU is the final production scaling signal. Dispatch queue depth and tracking ingest rate are better future custom metrics.

`secret-example.yaml` is deliberately excluded from `kustomization.yaml`. Secrets must be injected by the environment, ideally with AWS Secrets Manager + External Secrets/CSI integration.

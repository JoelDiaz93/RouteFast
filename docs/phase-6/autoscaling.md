# Phase 6 — Event-driven autoscaling

The base Kubernetes manifests keep CPU HPA because it works without extra cluster components. `k8s/performance` is an optional KEDA overlay that replaces CPU HPA for RabbitMQ consumers with queue-depth scaling.

```text
RabbitMQ queue depth
       │
       ▼
      KEDA
       │
       ▼
Deployment replicas
```

Order, Driver and Dispatch queues default to a target of 20 messages per replica, with 2–12 replicas. API Gateway and Tracking keep resource HPA in the overlay.

Requirements:

- KEDA installed in the cluster;
- `routefast-secrets` contains `RABBITMQ_URL`;
- RabbitMQ must be reachable from worker pods.

Validate rendered manifests with:

```bash
kubectl kustomize k8s/performance
```

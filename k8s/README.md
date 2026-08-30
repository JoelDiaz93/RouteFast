# RouteFast Kubernetes

The base manifests deploy only RouteFast application workloads. Stateful dependencies are intentionally externalized for the AWS target architecture: RDS/PostGIS, Amazon MQ for RabbitMQ, and ElastiCache for Redis.

## Before apply

1. Copy `base/secret-example.yaml` to a protected `secret.yaml` or create the Secret with your secret manager integration.
2. Replace the `CHANGE_ME_*` endpoints in `base/configmap.yaml` through an environment overlay.
3. Push the five images to your registry and update image references if needed.
4. Install AWS Load Balancer Controller and a metrics provider in the target EKS cluster.

Validate rendering:

```bash
kubectl kustomize k8s/base
```

The base deliberately does not include secrets or cloud credentials.

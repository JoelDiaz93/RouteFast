# RouteFast AWS deployment blueprint

Phase 5 keeps AWS behind infrastructure boundaries. Domain and application code contains no AWS SDK dependency.

## Target architecture

```
Internet
   |
AWS ALB
   |
Amazon EKS
   |-- api-gateway
   |-- order-service
   |-- driver-service
   |-- dispatch-service
   `-- tracking-service

Stateful services
   |-- Amazon RDS PostgreSQL  (separate logical ownership per bounded context)
   |-- RDS PostgreSQL + PostGIS for Tracking
   |-- Amazon MQ for RabbitMQ
   `-- ElastiCache for Redis

Observability
   RouteFast pods -> ADOT Collector -> AWS X-Ray
                                `----> CloudWatch

Delivery
   GitHub Actions -> container registry -> EKS rollout
```

## Recommended AWS services

| Concern | AWS service | Reason |
|---|---|---|
| Kubernetes | EKS | Demonstrates Kubernetes operation while keeping workloads portable |
| Container ingress | ALB + AWS Load Balancer Controller | Managed L7 entry point |
| PostgreSQL | RDS PostgreSQL | Managed backup, HA and patching options |
| Geospatial DB | RDS PostgreSQL with PostGIS | Preserves Phase 4 geospatial model |
| RabbitMQ | Amazon MQ for RabbitMQ | Keeps RabbitMQ semantics without operating the broker ourselves |
| Redis | ElastiCache | Managed Redis-compatible cache for GEO/BullMQ hot paths |
| Secrets | Secrets Manager | Avoids credentials in manifests |
| Traces | X-Ray through ADOT | OTEL-compatible trace destination |
| Logs/metrics | CloudWatch | Central operations plane and alarms |

## Availability model

Application pods are stateless and run across multiple nodes/AZs. Database/broker/cache HA is an infrastructure concern, not simulated in local Docker Compose.

## Production caveats

- `synchronize=true` is development-only; production requires explicit database migrations.
- HPA CPU thresholds are a baseline. Queue-depth and ingest-rate custom metrics should be added before production.
- The repository documents the deployment architecture; it does not claim an active paid EKS/RDS environment exists.

# Phase 5 Manual Validation

## 1. Install and infrastructure

```powershell
npm install
docker compose --profile observability up -d
docker compose ps
```

## 2. Quality gate

```powershell
npm run typecheck
npm test
npm run build
```

## 3. Start services

Either five terminals or:

```powershell
npm run start:all
```

## 4. Health

```text
GET http://localhost:3000/api/v1/health/live
GET http://localhost:3000/api/v1/health/ready
GET http://localhost:3001/health/live
GET http://localhost:3001/health/ready
GET http://localhost:3002/health/live
GET http://localhost:3002/health/ready
GET http://localhost:3003/health/live
GET http://localhost:3003/health/ready
GET http://localhost:3004/health/live
GET http://localhost:3004/health/ready
```

## 5. Metrics and traces

Run the RouteFast HTTP workflow, then inspect:

- Grafana: http://localhost:3005
- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686
- RabbitMQ: http://localhost:15672

Confirm that a request visible in structured logs can be located in Jaeger by its trace context and correlated with the `x-correlation-id` response header.

## 6. Failure scenario

```powershell
./scripts/phase5-chaos.ps1 -Target rabbitmq -Seconds 15
```

Create an order while RabbitMQ is unavailable, observe Outbox behavior, then verify workflow recovery after the broker returns.

## 7. Container build

```powershell
docker build --build-arg APP=api-gateway -t routefast-api-gateway:local .
docker build --build-arg APP=order-service -t routefast-order-service:local .
docker build --build-arg APP=driver-service -t routefast-driver-service:local .
docker build --build-arg APP=dispatch-service -t routefast-dispatch-service:local .
docker build --build-arg APP=tracking-service -t routefast-tracking-service:local .
```

## 8. Kubernetes render

```powershell
kubectl kustomize k8s/base
```

Do not apply the AWS-oriented base until endpoints and `routefast-secrets` are supplied by an environment overlay.

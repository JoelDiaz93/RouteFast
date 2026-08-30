# System context

```mermaid
flowchart LR
  Client[Client / Operations UI] --> GW[API Gateway\nNestJS]
  GW --> Order[Order Service]
  GW --> Driver[Driver Service]
  GW --> Dispatch[Dispatch Service]
  GW --> Tracking[Tracking Service]

  Order --> ODB[(Order PostgreSQL)]
  Driver --> DDB[(Driver PostgreSQL)]
  Dispatch --> XDB[(Dispatch PostgreSQL)]
  Tracking --> PGIS[(PostGIS)]
  Tracking --> Redis[(Redis GEO)]

  Order <--> RMQ[(RabbitMQ)]
  Driver <--> RMQ
  Dispatch <--> RMQ

  Dispatch --> Driver
  Dispatch --> Tracking
  Tracking --> WS[Socket.IO clients]

  GW -. traces .-> OTEL[OpenTelemetry Collector]
  Order -. traces .-> OTEL
  Driver -. traces .-> OTEL
  Dispatch -. traces .-> OTEL
  Tracking -. traces .-> OTEL
  OTEL --> Jaeger[Jaeger]

  GW -. metrics .-> Prom[Prometheus]
  Order -. metrics .-> Prom
  Driver -. metrics .-> Prom
  Dispatch -. metrics .-> Prom
  Tracking -. metrics .-> Prom
  RMQ -. metrics .-> Prom
  Prom --> Grafana[Grafana]
```

## Ownership rule

- Order owns order lifecycle state.
- Driver owns availability, capacity and reservation invariants.
- Dispatch owns assignment workflow and decision policy.
- Tracking owns current/historical location.
- No service reads another service's tables directly.

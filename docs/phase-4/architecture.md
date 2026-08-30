# Phase 4 Architecture

```text
                           RouteFast
                              │
                         API Gateway
                              │
       ┌──────────────────────┼───────────────────────┐
       ▼                      ▼                       ▼
 Order Service          Dispatch Service       Tracking Service
                              │                 :3004 /tracking
                    ┌─────────┴─────────┐              │
                    ▼                   ▼              ├── Redis GEO
              Driver Service      Tracking HTTP        ├── Socket.IO
              candidates          nearby drivers       └── BullMQ → PostGIS
                    │                   │
                    └─────────┬─────────┘
                              ▼
                     Driver Scoring Engine
                              │
                    ranked candidate IDs
                              │
                           RabbitMQ
                              │
                              ▼
                         Driver Service
                       row-locked reserve
```

## Boundary rule

Dispatch owns **selection policy**. Driver owns **capacity correctness**. Tracking owns **location state**.

This separation prevents Dispatch from directly updating driver capacity or reading Tracking Redis/PostGIS internals.

# Real-time tracking flow

```mermaid
flowchart TD
  App[Driver app / GPS source] -->|REST or Socket.IO| Tracking[Tracking Service]
  Tracking -->|compare-and-set timestamp| Redis[(Redis GEO)]
  Tracking -->|immediate fan-out| Socket[Socket.IO rooms]
  Tracking -->|enqueue persistence| Bull[BullMQ]
  Bull --> PostGIS[(PostGIS history)]

  Dispatch[Dispatch Service] -->|nearby candidates / ETA| Tracking
  Tracking --> Redis
  Tracking --> PostGIS

  Late[Late/out-of-order GPS event] --> Tracking
  Tracking -->|stored historically| PostGIS
  Tracking -.->|cannot rewind current position| Redis
```

Redis serves the hot current-location path. PostGIS remains the durable spatial history. An older event may be retained historically without replacing a newer live position.

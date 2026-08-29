# RouteFast

**Plataforma distribuida de logística de última milla y orquestación de entregas**

> Decisiones rápidas. Entregas confiables.

RouteFast es un proyecto de ingeniería backend diseñado para demostrar los problemas difíciles de logística de última milla: límites de dominio, microservicios, colas, orquestación, concurrencia, consistencia eventual, resiliencia y operación distribuida.

## Estado actual — Fase 3: Reliability & Concurrency ✅

La Fase 3 transforma el workflow distribuido de la Fase 2 en un sistema preparado para duplicados, fallos parciales y carreras concurrentes.

```text
Order Service
  ├── estado de negocio
  └── Outbox ─────────────┐
                          ▼
                       RabbitMQ
                          ↓
                    Dispatch Service
                    ├── Inbox / Outbox
                    ├── Saga
                    └── BullMQ → Redis
                          ↓
                       RabbitMQ
                          ↓
                     Driver Service
                     ├── Inbox / Outbox
                     └── reserva con lock PostgreSQL
```

### Implementado

- Transactional Outbox en Order, Driver y Dispatch;
- Consumer Inbox y `eventId` para deduplicación;
- `Idempotency-Key` en creación de órdenes;
- retries limitados en RabbitMQ;
- Dead Letter Queue por cola principal;
- reserva concurrente de conductores mediante locks de PostgreSQL;
- BullMQ + Redis para expiración diferida del assignment;
- Saga de compensación;
- compensación de reservas tardías después de timeout;
- estados `COMPENSATING` y `CANCELLED` en Dispatch;
- endpoint operacional de cancelación.

### Consistencia

RouteFast utiliza **at-least-once delivery**. No se afirma "exactly once".

```text
Cambio de negocio + Outbox
       ↓ misma transacción PostgreSQL
Outbox Worker
       ↓
RabbitMQ
       ↓
Inbox + operación idempotente
```

Esto elimina el problema principal de Fase 2 donde podía ocurrir:

```text
DB COMMIT ✓
RabbitMQ ✕
```

### Concurrencia

La regla principal es:

```text
reservas del conductor <= capacidad
```

Driver Service selecciona y reserva dentro de una transacción con row locking. Dos workers concurrentes no pueden modificar simultáneamente la misma capacidad.

### Compensación Saga

```text
Dispatch ASSIGNED
     ↓ cancelación
COMPENSATING
     ↓
release driver
     ↓
Driver released
     ↓
Dispatch CANCELLED
     ↓
Order CANCELLED
```

También se libera automáticamente una reserva que llegue tarde después de un timeout del workflow.

### Retry / DLQ

```text
main queue → fallo → retry queue → main queue
                                  ↓ retries agotados
                                 DLQ
```

La Fase 4 se concentrará en la complejidad específicamente logística: **PostGIS, Redis GEO, tracking, WebSockets, scoring de conductores y SLA**.

## Ejecutar localmente

```bash
cp .env.example .env
npm install
docker compose up -d
```

RabbitMQ Management:

```text
http://localhost:15672
routefast / routefast
```

Terminales:

```bash
npm run start:order
npm run start:driver
npm run start:dispatch
npm run start:gateway
```

Después utiliza [`routefast.http`](./routefast.http).

## Endpoints

```text
POST  /api/v1/orders
GET   /api/v1/orders
GET   /api/v1/orders/:id
PATCH /api/v1/orders/:id/cancel

POST  /api/v1/drivers
GET   /api/v1/drivers
PATCH /api/v1/drivers/:id/availability

GET   /api/v1/dispatches
GET   /api/v1/dispatches/:id
POST  /api/v1/dispatches/:id/cancel
```

## Documentación relevante

- [`PROJECT_SCOPE.md`](./PROJECT_SCOPE.md)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`ROADMAP.md`](./ROADMAP.md)
- [`PHASE_3_SUMMARY.md`](./PHASE_3_SUMMARY.md)
- [`PHASE_2_SUMMARY.md`](./PHASE_2_SUMMARY.md)
- [`docs/phase-3/reliability-flow.md`](./docs/phase-3/reliability-flow.md)
- [`docs/phase-3/concurrency.md`](./docs/phase-3/concurrency.md)
- [`docs/phase-3/event-catalog.md`](./docs/phase-3/event-catalog.md)
- [`docs/phase-2/event-catalog.md`](./docs/phase-2/event-catalog.md)
- [`docs/phase-2/sequence.md`](./docs/phase-2/sequence.md)
- [`docs/adr`](./docs/adr)

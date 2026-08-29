# RouteFast

**Plataforma distribuida de logística de última milla y orquestación de entregas**

> Decisiones rápidas. Entregas confiables.

RouteFast es un proyecto de ingeniería backend diseñado para demostrar los problemas difíciles de logística de última milla: límites de dominio, microservicios, colas, orquestación, concurrencia, consistencia eventual, resiliencia y operación distribuida.

## Estado actual — Fase 2: Event-Driven Services ✅

La Fase 2 convierte el primer vertical slice de órdenes en un workflow distribuido real:

```text
Cliente
  ↓
API Gateway
  ↓ HTTP
Order Service ───────► PostgreSQL Orders
  │
  │ order.ready_for_dispatch.v1
  ▼
RabbitMQ
  ↓
Dispatch Service ────► PostgreSQL Dispatch
  │
  │ driver.reservation_requested.v1
  ▼
RabbitMQ
  ↓
Driver Service ──────► PostgreSQL Drivers
  │
  └── driver.reserved.v1 / driver.reservation_failed.v1
```

### Implementado

- API Gateway NestJS;
- Order Service;
- Driver Service;
- Dispatch Service;
- base DDD / Clean Architecture;
- bases de datos independientes por servicio;
- RabbitMQ;
- eventos de integración versionados;
- CQRS selectivo en Dispatch Service;
- propagación de `correlationId`;
- acknowledgements manuales en consumidores;
- health/readiness;
- Docker Compose;
- pruebas del dominio;
- ADRs y catálogo de eventos.

## Flujo principal

```text
Crear Order
   ↓
order.ready_for_dispatch.v1
   ↓
Dispatch inicia búsqueda
   ↓
driver.reservation_requested.v1
   ↓
Driver Service reserva candidato
   ↓
driver.reserved.v1
   ↓
Dispatch = ASSIGNED
   ↓
dispatch.assigned.v1
   ↓
Order = ASSIGNED
```

Cuando no existe un conductor disponible:

```text
Driver Service
   ↓
driver.reservation_failed.v1
   ↓
Dispatch = FAILED
   ↓
dispatch.failed.v1
   ↓
Order vuelve a PENDING_DISPATCH
```

## Complejidad técnica que demostramos

- microservicios con ownership real de datos;
- comunicación REST vs RabbitMQ según el tipo de interacción;
- orquestación central en Dispatch;
- CQRS para separar comandos de workflow y consultas operativas;
- mensajes versionados;
- propagación de correlación entre servicios;
- consistencia eventual visible en el estado de Order y Dispatch.

## Limitaciones deliberadas de Fase 2

Todavía **no** afirmamos que el workflow sea production-safe:

1. existe dual-write entre PostgreSQL y RabbitMQ;
2. la reserva del driver todavía puede sufrir race conditions;
3. no existe Consumer Inbox para deduplicación;
4. no hay retry queues / DLQ replay;
5. no existe timeout/compensación de asignación.

Todo eso es exactamente el objetivo de la **Fase 3 — Reliability & Concurrency**.

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
```

## Documentación relevante

- [`PROJECT_SCOPE.md`](./PROJECT_SCOPE.md)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`ROADMAP.md`](./ROADMAP.md)
- [`PHASE_2_SUMMARY.md`](./PHASE_2_SUMMARY.md)
- [`docs/phase-2/event-catalog.md`](./docs/phase-2/event-catalog.md)
- [`docs/phase-2/sequence.md`](./docs/phase-2/sequence.md)
- [`docs/adr`](./docs/adr)

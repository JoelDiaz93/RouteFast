# RouteFast

**Plataforma distribuida de logística de última milla y orquestación de entregas**

> Decisiones rápidas. Entregas confiables.

RouteFast es un proyecto backend orientado a demostrar ingeniería con **NestJS + TypeScript** sobre problemas reales de logística: asignación concurrente de repartidores, flujos distribuidos, colas, idempotencia, geolocalización, tracking en tiempo real, resiliencia, observabilidad y escalamiento horizontal.

La complejidad se introduce por fases para que cada decisión tenga un problema concreto que resolver y pueda defenderse técnicamente en una entrevista.

## Problema central

Una plataforma de delivery debe seguir siendo correcta cuando:

- varios pedidos compiten por el mismo repartidor;
- RabbitMQ entrega un evento más de una vez;
- un servicio falla en mitad de una asignación;
- el repartidor no responde;
- llegan miles de actualizaciones GPS;
- el proveedor de rutas se vuelve lento;
- una transacción de base de datos se confirma pero la publicación del evento falla;
- múltiples réplicas del mismo servicio procesan trabajo en paralelo.

RouteFast se construirá específicamente para resolver y demostrar esos escenarios.

## Fase 1 implementada

```text
Cliente
   ↓
API Gateway :3000
   ↓ HTTP + x-correlation-id
Order Service :3001
   ↓
Application Use Cases
   ↓
Domain
   ↓
Repository Port
   ↓
TypeORM Adapter
   ↓
PostgreSQL :55432
```

Incluye:

- monorepo NestJS;
- API Gateway;
- primer microservicio: Order Service;
- agregado `Order` con reglas de estado;
- Clean Architecture / Ports & Adapters;
- PostgreSQL;
- endpoints REST;
- health/readiness;
- correlation IDs;
- pruebas unitarias;
- alcance, bounded contexts y ADRs.

## Lo que deliberadamente NO está todavía

RabbitMQ, Driver Service, Dispatch Orchestrator, Redis, PostGIS, Saga, Outbox/Inbox, WebSockets, Kubernetes y AWS pertenecen a fases posteriores. No se añaden en Foundation solo para aumentar artificialmente la lista de tecnologías.

## Documentación clave

- [`PROJECT_SCOPE.md`](./PROJECT_SCOPE.md): límites y no-objetivos.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): arquitectura actual y objetivo.
- [`ROADMAP.md`](./ROADMAP.md): fases técnicas.
- [`docs/domain/bounded-contexts.md`](./docs/domain/bounded-contexts.md): propiedad de cada dominio.
- [`docs/adr`](./docs/adr): decisiones arquitectónicas.

## Ejecución local

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run start:order
npm run start:gateway
```

Gateway:

```text
http://localhost:3000/api/v1
```

PostgreSQL local utiliza el puerto host `55432` para reducir conflictos con otras bases de datos de desarrollo.

## Próxima fase

**Phase 2 — Event-Driven Services**

- Driver Service
- Dispatch Service
- RabbitMQ
- contratos de eventos
- CQRS donde aporte valor
- bases de datos propiedad de cada servicio


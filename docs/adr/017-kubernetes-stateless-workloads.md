# ADR-017 — Kubernetes owns stateless application workloads

## Status
Accepted — Phase 5

## Context
The project must demonstrate horizontal scaling and container orchestration while preserving bounded-context data ownership.

## Decision
Deploy the five NestJS applications as stateless Kubernetes Deployments. Keep PostgreSQL/PostGIS, RabbitMQ and Redis outside application pods in the AWS target architecture using managed services.

## Consequences

- application replicas can be replaced/scaled independently;
- liveness/readiness and resource contracts become first-class;
- state durability is not tied to pod lifetime;
- cloud stateful services can evolve independently of the application images;
- local Docker Compose remains the development topology, not the production HA topology.

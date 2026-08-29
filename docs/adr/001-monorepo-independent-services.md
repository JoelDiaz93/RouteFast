# ADR-001 — Monorepo with Independently Deployable NestJS Services

**Status:** Accepted

## Context

RouteFast will contain several related services. A portfolio/research project benefits from one repository for discoverability and consistent tooling, but a single repository must not become a single deployable application.

## Decision

Use a NestJS monorepo containing independently buildable applications under `apps/`.

Each application has:

- its own entry point;
- explicit module wiring;
- separate runtime configuration;
- independent deployment intent.

## Consequences

### Positive

- easier local development;
- one place to review architecture and tests;
- consistent TypeScript/NestJS tooling;
- services can still evolve toward separate pipelines/images.

### Negative

- repository proximity can tempt developers to create inappropriate shared business libraries.

### Guardrail

Shared packages must not expose domain entities or repositories across bounded contexts.

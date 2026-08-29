# ADR-007 — CQRS is applied to Dispatch Service, not globally

## Status
Accepted.

## Context
Dispatch has workflow commands triggered by integration events and separate operational read endpoints. Applying CQRS to every RouteFast service would add ceremony without equivalent value.

## Decision
Use `@nestjs/cqrs` in Dispatch Service:
- commands start and complete dispatch workflows;
- queries expose dispatch operational state.

Order and Driver services remain application-use-case oriented until a concrete need justifies CQRS.

## Consequences
This demonstrates selective architectural use instead of framework-driven pattern adoption.

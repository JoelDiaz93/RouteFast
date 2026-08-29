# ADR-004 — Orchestration for Critical Dispatch, Choreography for Side Effects

**Status:** Accepted for Phase 3+

## Context

Pure event choreography can make critical multi-step workflows difficult to understand and compensate. Pure orchestration can unnecessarily couple unrelated side effects.

## Decision

Use a Saga orchestrator for the critical dispatch assignment workflow:

```text
Order ready
  ↓
Find candidates
  ↓
Reserve driver
  ↓
Request acceptance
  ↓
Create/confirm delivery
```

If a step fails, the orchestrator owns compensation/retry/reassignment policy.

Use choreography for independent reactions such as:

- notification;
- analytics;
- audit projection;
- non-critical operational views.

## Consequence

The project demonstrates that orchestration vs choreography is a business/workflow decision, not a universal architecture preference.

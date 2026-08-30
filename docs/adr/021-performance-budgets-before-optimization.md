# ADR-021 — Performance budgets before optimization

## Context

Performance claims without repeatable load conditions are not useful engineering evidence.

## Decision

Use k6 profiles with explicit thresholds and document environment/commit metadata for every published benchmark. Treat thresholds as budgets until measured.

## Consequences

- regressions can become CI gates later;
- profiling work has a repeatable workload;
- README claims remain evidence-based.

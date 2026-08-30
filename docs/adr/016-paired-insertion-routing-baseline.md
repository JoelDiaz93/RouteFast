# ADR-016 — Paired insertion as the multi-order routing baseline

## Context

RouteFast needs to demonstrate capacity-aware multi-order planning without falsely claiming an optimal Vehicle Routing Problem solution.

## Decision

Use a deterministic paired-insertion heuristic that evaluates feasible pickup/dropoff insertion positions and minimizes Haversine distance while preserving capacity and precedence.

## Consequences

- algorithm is explainable and unit-testable;
- runtime remains bounded by the 25-order request limit;
- the strategy can later be compared against OSRM/OR-Tools or another solver;
- results are heuristic, not mathematically optimal.

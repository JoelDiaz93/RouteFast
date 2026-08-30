# Phase 6 — Multi-order route heuristic

The `/api/v1/optimization/route-plan` endpoint demonstrates a bounded pickup-and-delivery heuristic for one vehicle.

## Invariants

- pickup always precedes its matching dropoff;
- vehicle load never exceeds capacity;
- vehicle load never becomes negative;
- an order whose demand exceeds vehicle capacity is rejected;
- the algorithm is deterministic for the same input.

## Strategy

`paired-insertion-v1` inserts each pickup/dropoff pair into the existing route at the feasible positions with the lowest Haversine distance.

This is **not** presented as an optimal VRP solver. It is an explainable baseline for comparing future routing strategies and profiling algorithmic cost.

The response includes the optimized distance, a simple sequential pickup/dropoff baseline and estimated distance savings relative to that baseline.

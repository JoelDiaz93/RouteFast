# Driver Scoring — `geo-score-v1`

The Phase 4 scorer is intentionally deterministic and explainable.

Default weights:

| Signal | Weight |
|---|---:|
| Distance to pickup | 55% |
| Remaining capacity | 20% |
| Current load | 15% |
| Location freshness | 10% |

Each component is normalized to `0..1` and the final score to `0..100`.

```text
score =
  distanceScore  * 0.55 +
  capacityScore  * 0.20 +
  loadScore      * 0.15 +
  freshnessScore * 0.10
```

## Priority-aware radius

- `EXPRESS`: search radius is capped at 5 km;
- `STANDARD`: configured base radius;
- `SCHEDULED`: 1.5 × base radius.

## SLA signal

The scorer estimates pickup time with:

```text
straight-line distance
 × road factor
 ÷ average urban speed
```

The result is classified as:

- `HEALTHY`
- `AT_RISK`
- `BREACH`

This is an assignment SLA signal, not a claim of road-network accurate ETA.

## Why scoring is in Dispatch

Driver Service should not decide product policy. It exposes capacity candidates and enforces capacity invariants. Dispatch owns the business decision for which candidate should be attempted first.

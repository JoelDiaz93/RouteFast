# Phase 4 Contract Changes

## `order.ready_for_dispatch.v1`

The existing v1 event already carries logistics context:

```json
{
  "eventId": "...",
  "orderId": "...",
  "priority": "EXPRESS",
  "pickup": { "latitude": -0.16, "longitude": -78.47 },
  "dropoff": { "latitude": -0.19, "longitude": -78.49 },
  "correlationId": "..."
}
```

Phase 4 starts consuming `priority` and `pickup` in Dispatch instead of ignoring them.

## `driver.reservation_requested.v1`

The event is extended with optional assignment hints while keeping Driver Service authoritative:

```json
{
  "eventId": "...",
  "dispatchId": "...",
  "orderId": "...",
  "correlationId": "...",
  "candidateDriverIds": ["best-driver", "second-driver"],
  "selectionStrategy": "geo-score-v1"
}
```

Compatibility semantics:

- `candidateDriverIds` omitted → legacy capacity-only fallback;
- empty `candidateDriverIds` → geo-aware dispatch found no eligible driver and Driver must fail reservation;
- non-empty list → Driver tries candidates in score order under its own row locks.

This distinction prevents a geo-aware dispatch with zero fresh candidates from silently assigning a driver with no usable location.

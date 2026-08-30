# Real-Time Tracking

Socket.IO namespace:

```text
http://localhost:3004/tracking
```

## Driver update

Event:

```text
driver.location.update
```

Payload:

```json
{
  "driverId": "<uuid>",
  "latitude": -0.1605,
  "longitude": -78.4695,
  "speedKph": 26,
  "headingDegrees": 190,
  "recordedAt": "2026-08-29T03:00:00.000Z"
}
```

Tracking Service immediately:

1. validates coordinates and timestamp;
2. atomically compares the GPS timestamp and updates Redis GEO only if the sample is not older than current hot state;
3. updates Redis location metadata with a TTL;
4. enqueues durable persistence to BullMQ;
5. broadcasts `driver.location.updated`.

## Subscriptions

```text
tracking.subscribe
```

Driver-specific:

```json
{ "driverId": "<uuid>" }
```

Operations stream:

```json
{ "operations": true }
```

## Stale locations

Dispatch excludes positions older than `DISPATCH_LOCATION_MAX_AGE_SECONDS`. A driver can be AVAILABLE in Driver Service but still be ineligible for geo-dispatch if its location is stale or missing.

## Out-of-order packets

A late GPS packet is still queued to PostGIS history, but a Redis Lua compare-and-set guard prevents it from rewinding the current live position or being broadcast as the new current location.

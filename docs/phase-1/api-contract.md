# Phase 1 API Contract

All public endpoints are exposed through the API Gateway.

Base URL:

```text
http://localhost:3000/api/v1
```

## POST /orders

Creates an order in `PENDING_DISPATCH` state.

### Request

```json
{
  "customerId": "CUS-1001",
  "priority": "STANDARD",
  "pickup": {
    "label": "North Warehouse",
    "address": "Example Ave 100",
    "latitude": -0.164,
    "longitude": -78.472
  },
  "dropoff": {
    "label": "Customer",
    "address": "Example Street 200",
    "latitude": -0.189,
    "longitude": -78.487
  }
}
```

## GET /orders/:id

Returns the authoritative order state from Order Service.

## GET /orders

Lists orders newest first.

## PATCH /orders/:id/cancel

Cancels an order only while its current state permits cancellation.

## Correlation

Clients may provide:

```http
x-correlation-id: custom-id
```

If absent, the gateway creates one. The ID is propagated to Order Service and returned in response headers.

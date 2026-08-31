# RouteFast Operations Console

## Purpose

The Operations Console is a **backend-validation and portfolio-demo client**, not a separate product domain.
It exists to prove that RouteFast's public contracts work from a real browser client without direct database access or service-internal shortcuts.

The console consumes the API Gateway for HTTP workflows and Socket.IO `/tracking` for real-time GPS events. v0.7.2 adds a bilingual ES/EN presentation layer and a real Leaflet/OpenStreetMap operational map.

## What it validates

| Capability | Backend contract exercised |
| --- | --- |
| Order creation + idempotency | `POST /api/v1/orders` + `Idempotency-Key` |
| Order state | `GET /api/v1/orders`, `GET /orders/:id`, cancellation |
| Driver fleet | create driver + availability transitions |
| Dispatch orchestration | list dispatches + decision audit + compensation |
| Live GPS | REST location update + Socket.IO update/subscription |
| Durable tracking | latest location + PostGIS history |
| Geospatial queries | nearby drivers + ETA |
| Route optimization | `POST /api/v1/optimization/route-plan` |
| Correlation | request activity shows `x-correlation-id` and client latency |
| Operational map | Leaflet/OpenStreetMap renders live drivers, pickup/dropoff points and optimized stops |
| Language | ES/EN selector persisted in `localStorage` |

## Guided E2E demo

`Run guided E2E demo` executes only public contracts:

1. create a driver,
2. mark it `AVAILABLE`,
3. publish a GPS position,
4. create an `EXPRESS` order,
5. poll the read model while RabbitMQ/Outbox/Dispatch/Driver reservation converges,
6. read the persisted scoring decision.

A successful run demonstrates that the browser client can observe the same distributed workflow that is covered by unit, integration, load and stress testing.

## Local development

Start infrastructure and the five compiled backend processes first:

```powershell
docker compose --profile observability up -d --wait --wait-timeout 60
npm run start:all:no-build
```

Then in another terminal:

```powershell
npm run ops:dev
```

Open `http://localhost:5173`.

Vite proxies `/api/*` to the API Gateway on port `3000`. In development the Socket.IO client connects directly to Tracking Service on `http://localhost:3004`, avoiding an unnecessary WebSocket proxy hop on Windows. The Tracking gateway already exposes CORS for the demo client.

## Validation

```powershell
npm run ops:typecheck
npm run ops:build
```

For the complete backend + frontend gate:

```powershell
npm run validate:full
```

## Deliberate exclusions

The console intentionally does not add authentication, customer onboarding, billing, role administration, consumer checkout, paid/geocoding APIs, or independent business logic. OpenStreetMap tiles are presentation-only and require internet access to display the basemap; RouteFast coordinates and routing data remain backend-owned. Those features would dilute the backend engineering case study without improving validation of the existing architecture.

## Bounded operational reads

The console requests only the latest 100 orders, drivers and dispatches. This is deliberate: stress tests can persist tens of thousands of records, and an unbounded `GET /orders` would force PostgreSQL, the Gateway, JSON serialization and React to process the entire benchmark history every five seconds. Public list endpoints accept `?limit=` with a maximum of 500 rows.


## Driver availability semantics

A driver can remain `AVAILABLE` while partially loaded. Therefore the console disables **Set offline** whenever `currentLoad > 0`, not only when status is `RESERVED`. The Driver Service also maps the domain `DriverUnavailableError` to HTTP `409 Conflict` so direct API clients receive a business conflict rather than an internal-server error.

## WebSocket lifecycle

The browser starts Socket.IO with HTTP polling and upgrades to WebSocket, using bounded connection timeout and exponential reconnection delay. This avoids relying on Vite as a WebSocket proxy and reduces transient `ECONNABORTED` noise on Windows during hot reload/restart.

## v0.7.6 — Unified Operations + Engineering UX

The Simple/Technical switch has been removed. RouteFast now exposes one coherent console intended for operators, reviewers and engineers.

Every screen follows the same structure:

- page title and functional description;
- **Purpose** — why the screen exists;
- **Core operations** — what actions can be executed there;
- **Primary source** — which backend service/read model owns the data;
- operational UI plus technical evidence, without a mode change.

The permanent navigation is Overview, Orders, Drivers, Live Tracking, Dispatch, Optimization Lab and API Activity. Helpful workflow explanations remain visible where they improve comprehension, but endpoint labels, REST/Socket.IO controls, PostGIS history, scoring payloads and correlation data are no longer hidden.

## v0.7.4 — Adaptive theme, filters and route experience

### Theme

The console supports System, Light and Dark themes through CSS variables and persists the preference in `localStorage`. The map uses the standard OpenStreetMap tile endpoint without an application API key. Dark mode applies a CSS filter to the same tile pane.

### Filters

The console filters the already bounded recent read models in the browser: delivery query/status/priority, driver query/status, assignment query/status and map driver status. This does not restore unbounded list reads.

### Driver route

From Live Map, **Build driver route** sends the selected driver's active assigned deliveries to the backend route planner. From Assignments, **View route** performs the same workflow for that assignment and opens the tracking surface.

The stop sequence comes from RouteFast. OSRM is used only to render a road-following line. Configure a different routing endpoint with `VITE_ROUTING_BASE_URL`; if routing geometry is unavailable, the console renders a dashed direct-segment fallback.


## v0.7.5 — Live route as the single operational map

Selecting a driver in Live Map automatically attempts to build that driver's active route. If assigned deliveries exist, RouteFast determines the pickup/dropoff sequence and the map displays it immediately. The route overlay shows ETA to the final stop, road distance and stop count. OSRM supplies presentation-only road geometry and duration; RouteFast ETA/direct segments remain the fallback.

The Optimization Lab is always available and explicitly scoped to evaluate `paired-insertion-v1` against a sequential baseline. Live Tracking remains the operational route surface, so the lab does not duplicate route execution.

Desktop navigation is fixed to `100dvh` and scrolls independently when necessary, so language/theme/connectivity controls remain part of the same persistent navigation flow.

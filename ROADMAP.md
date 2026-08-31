# RouteFast Roadmap

RouteFast was developed by technical risk rather than by accumulating features.

| Phase | Goal | Status |
|---|---|---|
| 1 | Foundation: DDD/Clean Architecture, Gateway, Order, PostgreSQL | ✅ Complete |
| 2 | Event-driven workflow: Driver, Dispatch, RabbitMQ, CQRS | ✅ Complete |
| 3 | Reliability: Outbox/Inbox, idempotency, concurrency, Saga, retry/DLQ | ✅ Complete |
| 4 | Logistics: PostGIS, Redis GEO, WebSockets, scoring, ETA/SLA | ✅ Complete |
| 5 | Operability: OTel, Prometheus/Grafana, Jaeger, K8s, CI/CD, AWS blueprint | ✅ Complete |
| 6 | Hardening: circuit breaker, profiling, KEDA, route heuristic, k6 | ✅ Complete |
| 6.4–6.5 | Security/runtime hygiene: 0 production audit findings, runtime/load preflights | ✅ Complete |
| 6.6–6.9 | Saturation experiment + controlled access-log optimization + Windows load harness | ✅ Complete |
| 7.0 | Operations Console: browser validation + guided distributed demo | ✅ Complete |
| 7.1 | Bounded operational reads + console scalability | ✅ Complete |
| 7.2 | Minimal UI, ES/EN, real map, availability/WS stabilization | ✅ Complete |
| 7.3 | Guided Operations UX + Simple/Technical progressive disclosure | ✅ Complete |
| 7.4 | Adaptive theme, bounded filters, responsive assignments + driver route | ✅ Complete |
| 7.5 | Route clarity, automatic ETA/route loading, no-key map + persistent sidebar | ✅ Complete |
| 7.6 | Unified operations + engineering UX; remove Simple/Technical mode split | ✅ Complete |

## Current gate

The backend engineering loop is closed for the portfolio objective: quality/security gates pass, local baseline tests are documented, progressive stress identified saturation, and one controlled hot-path optimization was measured with a before/after rerun. v0.7.x adds a thin Operations Console only to validate and demonstrate the existing public contracts from a real browser client; v0.7.4 adds adaptive themes, bounded filters, a responsive assignment decision layout and driver-oriented route visualization without moving domain decisions into React. v0.7.5 separates operational routing from algorithm experimentation and removes remaining map/navigation friction. v0.7.6 removes the experience-mode split and makes every screen's purpose, operations and backend ownership explicit.

## Next delivery step

Capture the final evidence set (Operations Console, Grafana, Jaeger, RabbitMQ, k6 and quality/security gate), publish the repository presentation, and integrate the RouteFast case study into the portfolio/interview narrative.

## Explicitly out of scope unless justified later

- adding microservices only to increase service count;
- replacing RabbitMQ/Redis/PostgreSQL without evidence;
- exact/optimal VRP claims;
- a production multi-region platform;
- large consumer-facing UI or frontend-owned business logic as a substitute for backend evidence;
- premature performance tuning without traces/metrics.


## v0.7.3 — Guided Operations UX ✅

- initial Simple/Technical progressive disclosure (superseded by v0.7.6 unified UX)
- first-time-friendly delivery lifecycle explanation
- context-aware next action on Home
- operational terminology and page guidance
- map-first live tracking
- explainable “Why this driver?” assignment view
- larger, calmer visual system and local SVG navigation icons


## v0.7.4 — Adaptive Theme, Filters & Driver Route ✅

- System / Light / Dark preference persisted in the browser
- theme-aware CARTO/OSM basemap
- off-white light surfaces and charcoal dark surfaces
- Deliveries / Fleet / Assignments filters
- driver-status map filtering
- responsive Assignments list/detail layout
- candidate cards protected from horizontal overflow
- backend route-plan reused for selected-driver routes
- optional OSRM road geometry with direct-line fallback


## v0.7.5 — Route Clarity & Navigation Continuity ✅

- fixed full-height desktop sidebar independent from document scroll
- standard OpenStreetMap basemap with no application API key
- dark theme rendered from the same no-key tile layer
- automatic driver route loading when a driver is selected on Live Map
- in-map ETA, road distance and stop-count summary
- theme-aware, readable sticky table headers and row contrast
- operational routing remains in Live Tracking
- Optimization Lab clarifies sequential-vs-optimized algorithm validation


## v0.7.6 — Unified Operations + Engineering UX ✅

- removed Simple/Technical mode selector and `routefast.experienceMode` state
- all seven console surfaces are always available
- added a shared Purpose / Core operations / Primary source context strip to every page
- retained human-readable operational guidance without hiding endpoints or technical controls
- Dispatch shows candidate scoring cards and raw decision payload together
- Tracking always exposes REST, Socket.IO, route recalculation and PostGIS history
- Orders/Drivers keep workflow/status guidance while exposing technical identifiers and endpoints

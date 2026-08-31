# Evidence screenshot checklist

Store final portfolio screenshots under `docs/evidence/screenshots/`. Prefer one clean screenshot per proof point; avoid a gallery of repetitive terminal output.

## Recommended captures

0. **Operations Console — Overview + guided E2E demo**
   - dashboard metrics;
   - Leaflet/OpenStreetMap operational map with live drivers + pickup/dropoff;
   - successful guided workflow steps;
   - ES/EN selector visible;
   - Suggested file: `ops-console-overview.png`.


1. **Grafana — RouteFast Overview**
   - request rate;
   - p95 latency;
   - 5xx rate;
   - dependency/circuit-breaker panels if visible.
   - Suggested file: `grafana-overview.png`.

2. **Jaeger — one complete order/dispatch trace**
   - Gateway → Order → Dispatch/Tracking/Driver path;
   - visible span durations;
   - Suggested file: `jaeger-dispatch-trace.png`.

3. **RabbitMQ management**
   - RouteFast queues plus retry/DLQ topology;
   - Suggested file: `rabbitmq-topology.png`.

4. **k6 mixed + stress evidence**
   - mixed baseline with 0% errors;
   - post-sampling stress run showing 0% HTTP failures and the saturation point;
   - Suggested files: `k6-mixed-baseline.png`, `k6-stress-after.png`.

5. **Security/quality gate**
   - concise terminal showing `27 passed`, build artifact verification and `0 vulnerabilities`;
   - Suggested file: `quality-security-gate.png`.

## Capture rules

- Crop out unrelated desktop content and personal paths where possible.
- Do not expose secrets, tokens, credentials or private repository URLs.
- Keep browser zoom/readability consistent.
- Prefer the measured v0.6.5/v0.6.6 evidence over older failed runs.
- Add a short caption in the README/case study explaining what the screenshot proves.

## v0.7.4 console evidence

Prefer one Light and one Dark Operations Console capture rather than duplicating every screen. The strongest UI evidence is:

- Assignments with filters applied and the responsive “Why this driver?” detail visible without page overflow.
- Live Map in Dark mode with a selected driver, numbered pickup/dropoff stops and a road-following route line.
- Optional Light-mode Home capture to demonstrate the adaptive visual system.

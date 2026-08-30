# Evidence screenshot checklist

Store final portfolio screenshots under `docs/evidence/screenshots/`. Prefer one clean screenshot per proof point; avoid a gallery of repetitive terminal output.

## Recommended captures

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

4. **k6 successful mixed baseline**
   - thresholds + total results with 0% errors;
   - Suggested file: `k6-mixed-baseline.png`.

5. **Security/quality gate**
   - concise terminal showing `27 passed`, build artifact verification and `0 vulnerabilities`;
   - Suggested file: `quality-security-gate.png`.

## Capture rules

- Crop out unrelated desktop content and personal paths where possible.
- Do not expose secrets, tokens, credentials or private repository URLs.
- Keep browser zoom/readability consistent.
- Prefer the measured v0.6.5/v0.6.6 evidence over older failed runs.
- Add a short caption in the README/case study explaining what the screenshot proves.

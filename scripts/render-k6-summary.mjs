import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [input = 'performance/results/stress-latest.json', output = 'performance/results/STRESS_LATEST.md'] = process.argv.slice(2);
if (!fs.existsSync(input)) {
  console.error(`k6 summary not found: ${input}`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(input, 'utf8'));
const metrics = summary.metrics ?? {};
const values = (name) => metrics[name]?.values ?? {};
const number = (value, digits = 2) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
const integer = (value) => typeof value === 'number' && Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : 'n/a';

const failedRate = values('http_req_failed').rate;
const dropped = values('dropped_iterations').count ?? 0;
const reqs = values('http_reqs');
const iterations = values('iterations');
const orders = values('http_req_duration{scenario:orders}');
const tracking = values('http_req_duration{scenario:tracking}');

const saturationSignals = [];
if (typeof failedRate === 'number' && failedRate >= 0.02) saturationSignals.push(`HTTP failure rate reached ${(failedRate * 100).toFixed(2)}%.`);
if (dropped > 0) saturationSignals.push(`${integer(dropped)} scheduled iterations were dropped.`);
if (typeof orders['p(95)'] === 'number' && orders['p(95)'] >= 600) saturationSignals.push(`Orders p95 reached ${number(orders['p(95)'])} ms (baseline budget: 600 ms).`);
if (typeof tracking['p(95)'] === 'number' && tracking['p(95)'] >= 250) saturationSignals.push(`Tracking p95 reached ${number(tracking['p(95)'])} ms (baseline budget: 250 ms).`);

const cpu = os.cpus()[0]?.model ?? 'unknown';
const totalRamGb = os.totalmem() / (1024 ** 3);
const status = saturationSignals.length === 0 ? 'No saturation signal detected by the baseline criteria.' : 'Saturation/investigation signals detected.';

const markdown = `# RouteFast progressive stress snapshot\n\n` +
`Generated: ${new Date().toISOString()}\n\n` +
`> This report is a local engineering measurement, not a production capacity claim. Compare runs only when the environment and RouteFast revision are controlled.\n\n` +
`## Environment\n\n` +
`| Item | Value |\n|---|---|\n` +
`| RouteFast | v0.6.6 |\n` +
`| Node | ${process.version} |\n` +
`| OS | ${os.platform()} ${os.release()} (${os.arch()}) |\n` +
`| CPU | ${cpu.replaceAll('|', '\\|')} |\n` +
`| Host RAM | ${number(totalRamGb, 1)} GiB |\n` +
`| k6 | Docker image pinned in docker-compose.yml |\n\n` +
`## Workload\n\n` +
`Progressive target: approximately **50 → 100 → 200 → 400 iterations/s**, split 20% orders / 80% GPS tracking.\n\n` +
`## Result\n\n` +
`| Metric | Value |\n|---|---:|\n` +
`| HTTP requests | ${integer(reqs.count)} |\n` +
`| HTTP request rate | ${number(reqs.rate)} req/s |\n` +
`| Iterations | ${integer(iterations.count)} |\n` +
`| Iteration rate | ${number(iterations.rate)} iter/s |\n` +
`| HTTP failure rate | ${typeof failedRate === 'number' ? (failedRate * 100).toFixed(2) + '%' : 'n/a'} |\n` +
`| Dropped iterations | ${integer(dropped)} |\n` +
`| Orders p95 | ${number(orders['p(95)'])} ms |\n` +
`| Orders max | ${number(orders.max)} ms |\n` +
`| Tracking p95 | ${number(tracking['p(95)'])} ms |\n` +
`| Tracking max | ${number(tracking.max)} ms |\n\n` +
`## Interpretation\n\n**${status}**\n\n` +
(saturationSignals.length ? saturationSignals.map((x) => `- ${x}`).join('\n') : '- Error rate remained below 2%.\n- No dropped iterations were reported.\n- Orders p95 remained below 600 ms.\n- Tracking p95 remained below 250 ms.') +
`\n\n## Next action\n\nIf a saturation signal appears, inspect the same time window in Grafana and Jaeger before changing code. Optimize only the component supported by traces/metrics, then rerun this exact profile and compare before/after.\n`;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, markdown);
console.log(`\nStress report written to ${output}`);

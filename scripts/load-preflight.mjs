const targets = [
  { name: 'api-gateway', url: process.env.ROUTEFAST_GATEWAY_READY_URL || 'http://localhost:3000/api/v1/health/ready' },
  { name: 'order-service', url: process.env.ROUTEFAST_ORDER_READY_URL || 'http://localhost:3001/health/ready' },
  { name: 'driver-service', url: process.env.ROUTEFAST_DRIVER_READY_URL || 'http://localhost:3002/health/ready' },
  { name: 'dispatch-service', url: process.env.ROUTEFAST_DISPATCH_READY_URL || 'http://localhost:3003/health/ready' },
  { name: 'tracking-service', url: process.env.ROUTEFAST_TRACKING_READY_URL || 'http://localhost:3004/health/ready' },
];

const timeoutMs = Number(process.env.ROUTEFAST_PREFLIGHT_TIMEOUT_MS || 3000);
const failures = [];

async function probe(target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(target.url, { signal: controller.signal });
    if (!response.ok) {
      failures.push(`${target.name}: HTTP ${response.status} (${target.url})`);
      return;
    }

    console.log(`[ready] ${target.name.padEnd(18)} ${target.url}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    failures.push(`${target.name}: ${reason} (${target.url})`);
  } finally {
    clearTimeout(timer);
  }
}

await Promise.all(targets.map(probe));

if (failures.length > 0) {
  console.error('\nRouteFast load-test preflight failed.');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nStart infrastructure and all five NestJS processes before running k6:');
  console.error('  docker compose --profile observability up -d');
  console.error('  npm run start:all');
  console.error('\nKeep start:all running in its terminal, then run the load test from another terminal.');
  process.exit(1);
}

console.log('\nRouteFast load-test preflight: OK');

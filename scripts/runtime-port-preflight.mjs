import net from 'node:net';
import { execFileSync } from 'node:child_process';

const services = [
  { name: 'api-gateway', port: Number(process.env.API_GATEWAY_PORT ?? 3000) },
  { name: 'order-service', port: Number(process.env.ORDER_SERVICE_PORT ?? 3001) },
  { name: 'driver-service', port: Number(process.env.DRIVER_SERVICE_PORT ?? 3002) },
  { name: 'dispatch-service', port: Number(process.env.DISPATCH_SERVICE_PORT ?? 3003) },
  { name: 'tracking-service', port: Number(process.env.TRACKING_SERVICE_PORT ?? 3004) },
];

function canBind(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', (error) => {
      if (error?.code === 'EADDRINUSE' || error?.code === 'EACCES') {
        resolve(false);
        return;
      }
      resolve(false);
    });
    server.listen({ port, host: '0.0.0.0', exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

function windowsOwner(port) {
  if (process.platform !== 'win32') return undefined;
  try {
    const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    const match = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => {
        const fields = line.split(/\s+/);
        if (fields.length < 5 || fields[0].toUpperCase() !== 'TCP') return false;
        const local = fields[1];
        const state = fields[3]?.toUpperCase();
        return state === 'LISTENING' && local.endsWith(`:${port}`);
      });

    if (!match) return undefined;
    const pid = match.split(/\s+/).at(-1);
    if (!pid || !/^\d+$/.test(pid)) return undefined;

    let processName;
    try {
      const task = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], {
        encoding: 'utf8',
        windowsHide: true,
      }).trim();
      if (task && !task.startsWith('INFO:')) {
        const csvMatch = task.match(/^"([^"]+)"/);
        processName = csvMatch?.[1];
      }
    } catch {
      // PID is still useful even when tasklist cannot resolve the image name.
    }

    return { pid, processName };
  } catch {
    return undefined;
  }
}

const results = await Promise.all(
  services.map(async (service) => ({
    ...service,
    free: await canBind(service.port),
  })),
);

const occupied = results.filter((result) => !result.free);

if (occupied.length === 0) {
  for (const service of results) {
    console.log(`[free]  ${service.name.padEnd(18)} localhost:${service.port}`);
  }
  console.log('\nRouteFast runtime port preflight: OK');
  process.exit(0);
}

console.error('\nRouteFast runtime port preflight failed.');
console.error('The following application ports are already occupied:\n');

for (const service of occupied) {
  const owner = windowsOwner(service.port);
  const suffix = owner
    ? ` — PID ${owner.pid}${owner.processName ? ` (${owner.processName})` : ''}`
    : '';
  console.error(`  - ${service.name.padEnd(18)} localhost:${service.port}${suffix}`);
}

if (process.platform === 'win32') {
  console.error('\nInspect the owner before stopping it:');
  for (const service of occupied) {
    console.error(`  Get-NetTCPConnection -LocalPort ${service.port} -State Listen | Select-Object LocalPort,OwningProcess`);
  }
  console.error('\nIf the PID belongs to an old RouteFast Node process, stop that specific PID:');
  console.error('  Stop-Process -Id <PID> -Force');
} else {
  console.error('\nInspect listeners before stopping anything:');
  for (const service of occupied) {
    console.error(`  lsof -nP -iTCP:${service.port} -sTCP:LISTEN`);
  }
}

console.error('\nRouteFast does not kill occupied ports automatically to avoid terminating unrelated applications.');
process.exit(1);

import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const service = process.argv[2];
const allowed = new Set(['dispatch-service', 'tracking-service']);
if (!service || !allowed.has(service)) {
  console.error('Usage: node scripts/profile-service.mjs <dispatch-service|tracking-service>');
  process.exit(2);
}

mkdirSync('profiles', { recursive: true });
const entry = `dist/apps/${service}/main.js`;
const child = spawn(process.execPath, [
  '--cpu-prof', '--heap-prof',
  '--cpu-prof-dir=profiles', '--heap-prof-dir=profiles',
  entry,
], { stdio: 'inherit', env: process.env });

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

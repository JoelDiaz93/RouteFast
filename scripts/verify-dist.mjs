import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const entries = [
  ['api-gateway', 'dist/apps/api-gateway/main.js'],
  ['order-service', 'dist/apps/order-service/main.js'],
  ['driver-service', 'dist/apps/driver-service/main.js'],
  ['dispatch-service', 'dist/apps/dispatch-service/main.js'],
  ['tracking-service', 'dist/apps/tracking-service/main.js'],
];

const missing = [];
for (const [service, relativePath] of entries) {
  const fullPath = resolve(relativePath);
  try {
    await access(fullPath, constants.R_OK);
    console.log(`[dist] ${service.padEnd(18)} ${relativePath}`);
  } catch {
    missing.push({ service, relativePath });
  }
}

if (missing.length > 0) {
  console.error('\nRouteFast build artifact verification failed:');
  for (const item of missing) {
    console.error(`  - ${item.service}: missing ${item.relativePath}`);
  }
  process.exit(1);
}

console.log('\nRouteFast build artifact verification: OK');

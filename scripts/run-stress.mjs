import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const dockerArgs = [
  'compose', '--profile', 'performance', 'run', '--rm', 'k6',
  'run', '--summary-export=/results/stress-latest.json', '/scripts/stress.js',
];

const run = spawnSync('docker', dockerArgs, { stdio: 'inherit' });

if (existsSync('performance/results/stress-latest.json')) {
  const report = spawnSync(
    process.execPath,
    ['scripts/render-k6-summary.mjs', 'performance/results/stress-latest.json', 'performance/results/STRESS_LATEST.md'],
    { stdio: 'inherit' },
  );
  if (report.status !== 0) process.exit(report.status ?? 1);
} else {
  console.error('\nNo k6 summary was produced at performance/results/stress-latest.json.');
}

process.exit(run.status ?? 1);

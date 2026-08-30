import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const sampleRate = process.env.HTTP_ACCESS_LOG_SAMPLE_RATE ?? '0.01';
const benchmarkEnv = {
  ...process.env,
  HTTP_ACCESS_LOG_SAMPLE_RATE: sampleRate,
};

function runNodeCheck(label, relativeScript) {
  const script = resolve(relativeScript);
  const result = spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    env: benchmarkEnv,
    windowsHide: false,
  });

  if (result.error) {
    console.error(`\n[benchmark] ${label} could not start.`);
    console.error(result.error);
    process.exit(1);
  }

  if (result.signal) {
    console.error(`\n[benchmark] ${label} terminated by signal ${result.signal}.`);
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    console.error(`\n[benchmark] ${label} failed with exit code ${result.status ?? 'unknown'}.`);
    process.exit(result.status ?? 1);
  }
}

// Run the checks with Node directly. This avoids the Windows npm.cmd spawn issue
// while leaving the actual five-service runtime unchanged.
runNodeCheck('runtime port preflight', 'scripts/runtime-port-preflight.mjs');
runNodeCheck('build artifact verification', 'scripts/verify-dist.mjs');

console.log(`\nRouteFast benchmark runtime: successful HTTP access-log sample rate = ${sampleRate}`);
console.log('HTTP 4xx/5xx responses remain unsampled. Prometheus metrics and OpenTelemetry traces remain enabled.');
console.log('Starting the same concurrently-based runtime used by start:all:no-build.\n');

// Preserve the benchmark invariant: only access-log sampling changes relative to
// the baseline. On Windows, shell:true lets cmd.exe resolve npm correctly instead
// of asking child_process to execute npm.cmd directly.
const child = process.platform === 'win32'
  ? spawn('npm run start:all:unsafe', {
      stdio: 'inherit',
      env: benchmarkEnv,
      shell: true,
      windowsHide: false,
    })
  : spawn('npm', ['run', 'start:all:unsafe'], {
      stdio: 'inherit',
      env: benchmarkEnv,
    });

child.once('error', (error) => {
  console.error('\n[benchmark] failed to launch the five-service runtime.');
  console.error(error);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    try {
      child.kill(signal);
    } finally {
      process.exit(0);
    }
  });
}

child.once('exit', (code, signal) => {
  if (signal) {
    console.error(`\n[benchmark] runtime terminated by signal ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});

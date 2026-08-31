import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'README.md',
  'ARCHITECTURE.md',
  'docs/adr/README.md',
  'docs/performance/BASELINE_v0.6.5.md',
  'docs/performance/STRESS_BASELINE_v0.6.6.md',
  'docs/performance/STRESS_AFTER_v0.6.9.md',
  'docs/frontend/OPS_CONSOLE.md',
  'PHASE_7_3_GUIDED_OPERATIONS_UX.md',
  'PHASE_7_4_ADAPTIVE_THEME_FILTERS_ROUTE.md',
  'PHASE_7_5_ROUTE_CLARITY.md',
  'PHASE_7_6_UNIFIED_TECHNICAL_OPERATIONS.md',
  'docs/performance/STRESS_TEST.md',
  'docs/security/SECURITY_BASELINE_v0.6.4.md',
  'docs/portfolio/CASE_STUDY.md',
  'docs/portfolio/INTERVIEW_GUIDE.md',
  'docs/evidence/SCREENSHOT_CHECKLIST.md',
  'docs/diagrams/system-context.md',
  'docs/diagrams/dispatch-saga.md',
  'docs/diagrams/tracking-flow.md',
  'docs/diagrams/observability.md',
];

let failed = false;
for (const file of required) {
  const full = path.join(repoRoot, file);
  if (fs.existsSync(full) && fs.statSync(full).size > 0) console.log(`[showcase] ${file}`);
  else { console.error(`[missing]  ${file}`); failed = true; }
}

if (failed) process.exit(1);
console.log('\nRouteFast showcase documentation check: OK');

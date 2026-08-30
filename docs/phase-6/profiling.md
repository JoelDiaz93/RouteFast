# Phase 6 — Profiling workflow

Optimization follows measurement. RouteFast therefore includes Node CPU/heap profiling commands for the two paths most likely to become CPU or allocation hotspots: Dispatch scoring/route planning and Tracking ingestion.

```bash
npm run build
npm run profile:dispatch
npm run profile:tracking
```

Node writes `.cpuprofile` and `.heapprofile` artifacts to `profiles/`, which is gitignored. Inspect them in Chrome DevTools or another compatible profiler.

Profile under a reproducible k6 workload and record:

1. commit SHA;
2. Node version;
3. CPU/RAM limits;
4. dataset size;
5. k6 profile;
6. before/after flamegraph evidence.

Do not optimize a function based only on intuition.

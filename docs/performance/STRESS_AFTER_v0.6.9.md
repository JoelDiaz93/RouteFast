# Stress result after access-log sampling — v0.6.9

This run repeated the same progressive profile used for the v0.6.6 saturation baseline.
The backend runtime used successful-request access-log sampling while retaining error logs, Prometheus metrics and OpenTelemetry tracing.

## Result

| Metric | v0.6.6 baseline | v0.6.9 post-change |
| --- | ---: | ---: |
| First explicit `Insufficient VUs` | ~138–141 s | tracking ~189 s; orders ~210 s |
| HTTP failure rate | 3.80% | **0.00%** |
| Dropped iterations | 26,733 | **8,455** |
| Completed iterations | 13,780 | **33,828** |
| Observed iteration rate | ~42.88/s | **~140.37/s** |
| Orders p95 | 14.62 s | **1.45 s** |
| Tracking p95 | 4.19 s | **1.38 s** |
| Completed checks | 98.43% | **100%** |

The stress thresholds still fail at the top end of the test, which is expected: the purpose of this profile is to find saturation rather than certify a production SLO.

## Interpretation

The system moved from early saturation inside the ~200 operations/s stage to sustaining that level and degrading while ramping toward the ~400 operations/s target.
The post-change run showed latency saturation and VU exhaustion without HTTP failures.

A careful claim is therefore:

> In this local stress profile, RouteFast sustained the ~200 operations/s stage and began to saturate while scaling into the ~300–400 operations/s range. This is a local engineering benchmark, not a production capacity guarantee.

## Engineering lesson

The before/after experiment changed one hot-path variable and reran the same load profile. That produced a measurable reduction in dropped work and tail latency, validating successful-request access-log volume as a significant local runtime cost under high concurrency.

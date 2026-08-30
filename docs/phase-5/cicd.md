# Phase 5 — CI/CD and security gates

`ci.yml` separates source quality from container quality:

```
PR / push
  -> install
  -> typecheck
  -> tests + coverage
  -> Nest build
  -> production dependency audit
  -> image matrix build (5 services)
  -> Trivy HIGH/CRITICAL scan
```

`codeql.yml` adds JavaScript/TypeScript static analysis.

A `v*` Git tag triggers `release-images.yml`, which publishes one independently deployable image per RouteFast application to GHCR. Production promotion to EKS should be a separate environment-protected deployment job rather than an automatic side effect of every merge.

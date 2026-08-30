# ADR-018 — CI/CD quality gates before image publication

## Status
Accepted — Phase 5

## Context
Publishing a container only because TypeScript compiled does not demonstrate delivery maturity.

## Decision
Separate source quality from container quality. Pull requests run typecheck, tests/coverage, build and dependency audit; images are built in a matrix and scanned for HIGH/CRITICAL vulnerabilities. CodeQL runs separately. Tagged releases publish independently versioned service images.

## Consequences

- a broken domain test blocks container publication;
- container vulnerabilities are evaluated after image construction;
- release publication remains auditable and independent per service;
- production deployment remains a separate, environment-protected concern.

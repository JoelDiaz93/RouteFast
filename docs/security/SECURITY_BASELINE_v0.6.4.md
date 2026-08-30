# Production dependency security baseline — v0.6.4+

## Result

After the controlled OpenTelemetry migration and a non-breaking `npm audit fix`, the production dependency gate reported:

```text
npm audit --omit=dev
found 0 vulnerabilities
```

The complete quality gate also passed:

- TypeScript typecheck;
- 10 Jest suites / 27 tests;
- build of all five NestJS applications;
- verification of all five compiled `main.js` artifacts;
- `npm run security:audit` with **0 production vulnerabilities**.

## Security decisions

- OpenTelemetry was migrated explicitly instead of using `npm audit fix --force`.
- Production audit is part of CI.
- Container images are scanned with Trivy for HIGH/CRITICAL findings.
- CodeQL analyzes JavaScript/TypeScript.
- Dependabot groups OpenTelemetry updates for controlled review.
- Secrets are not committed; Kubernetes contains only a secret example/template.

## Interpretation

A zero-result npm audit is not a claim that the system is vulnerability-free. It only means the installed production dependency graph had no advisories reported by npm at the time of the baseline. Runtime configuration, authorization, network policy, secrets, image provenance and application-level threats remain separate security concerns.

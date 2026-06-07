# Prompt 53: Release Policy Diagnostic QA

## Summary

Validate the Prompt 52 release-policy schema foundation and default policy/rule
records.

This is a QA/docs slice only. Do not add snapshots, findings, overrides, hard
blocking, auth/signatures, provider integrations, file uploads, `ReleasePackage`,
or release-action changes.

## Checks

- Verify local migrations are current.
- Verify local seed creates default release policy profiles/rules.
- Verify gated release-policy backfill is idempotent with
  `RUN_RELEASE_POLICY_BACKFILL=1`.
- Verify `/api/health` shows nonzero `releasePolicyProfiles` and
  `releasePolicyRules`.
- Verify `/api/health` shows zero `releaseReadinessSnapshots`,
  `releaseReadinessFindings`, `releaseOverrides`, and `releaseAuditEvents`.
- Verify `/internal/release-policy-readiness` returns successfully and reports
  no missing default authority policy/rule coverage.
- Verify FlightLeg detail still renders Release Readiness and Release Control.
- Verify release actions remain warning-only and unchanged.

## Validation

```powershell
npm run db:local:up
npm run db:local:migrate
npm run db:local:seed
$env:RUN_RELEASE_POLICY_BACKFILL="1"; npm run backfill:release-policy
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime smoke:

- `/`
- `/operations-control`
- `/operations-control/[flightLegId]`
- `/api/health`
- `/internal/release-policy-readiness`
- `/flights`
- `/aircraft`
- `/crew`
- `/scheduling`

# Prompt 47: Release Blocking Preview Foundation

## Summary

Add a non-enforcing release-blocking preview to the existing FlightLeg release
readiness checklist.

This slice must not block release actions. It must not add schema, mutate
evidence, change `FlightRelease` action behavior, add auth/signatures, add
overrides, add provider integrations, or add file uploads.

## Scope

- Use `docs/RELEASE_BLOCKING_POLICY.md` as the policy source.
- Add `Would block release` / `Would warn` labels to FlightLeg readiness items.
- Keep a clear `Ready` state for items with no current readiness finding.
- Show preview totals for would-block and would-warn findings.
- Keep Release Control actions visible and available.

## Classification Rules

- Manifest not ready: `Would block release`.
- W&B not ready: `Would block release`.
- Flight locating not ready: `Would block release`.
- Dispatch package not ready: `Would block release`.
- Weather route summary missing: `Would block release`.
- NOTAM affected station codes missing: `Would block release`.
- Flight-plan external reference or route text missing: `Would block release`.
- Airworthiness missing assigned aircraft, active configuration, current
  released aircraft airworthiness release, or non-expired release:
  `Would block release`.
- Airworthiness with only open/deferred discrepancies or active deferrals:
  `Would warn`.

## Deferred

- Actual release blocking.
- Override workflow.
- Auth, roles, user identity, and signatures.
- Authority-specific policy engine.
- MEL/CDL legal interpretation.
- Crew compliance enforcement.
- Provider integrations.
- File uploads.
- `ReleasePackage`.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open `/operations-control/[flightLegId]`.
- Confirm the readiness checklist shows policy preview labels.
- Confirm Release Control actions remain visible.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return successfully.

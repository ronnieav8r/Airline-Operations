# Prompt 48: Release Blocking Preview QA

## Summary

Run a focused QA pass on the non-enforcing release-blocking preview added to
FlightLeg detail.

This is a QA/docs slice. Do not add schema, auth/signatures, overrides,
provider integrations, file uploads, hard release blocking, or new evidence
mutation.

## Scope

- Confirm `/operations-control/[flightLegId]` renders release-readiness preview
  labels.
- Confirm the page shows non-enforcing `Would block release`, `Would warn`, or
  `No blocker` policy preview states.
- Confirm preview totals render.
- Confirm Release Control actions remain visible.
- Confirm release actions still mutate `FlightRelease` status and are not
  blocked by preview findings.
- Update status and QA docs.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/`
- `/operations-control`
- `/operations-control/[flightLegId]`
- `/api/health`
- `/internal/flightleg-parity`
- `/internal/flightleg-write-readiness`

Workflow smoke:

- Invoke mark released for a local FlightLeg.
- Confirm linked `FlightRelease.status` becomes `RELEASED`.
- Invoke cancel release for the same local FlightLeg.
- Confirm linked `FlightRelease.status` becomes `CANCELLED`.
- Invoke void release for the same local FlightLeg.
- Confirm linked `FlightRelease.status` becomes `VOIDED`.

## Deferred

- Actual hard release blocking.
- Override workflow.
- Auth, roles, user identity, and signatures.
- Authority-specific policy engine.
- MEL/CDL legal interpretation.
- Crew compliance enforcement.
- Provider integrations.
- File uploads.
- `ReleasePackage`.

# Prompt 172: ReleasePackage Capture Foundation

## Summary

Prompt 172 adds an explicit ReleasePackage preview capture action on FlightLeg
detail. It does not auto-capture, hard-block release, finalize packages, add
signatures, add file uploads, or mutate `FlightRelease.status`.

## Implemented Scope

- Added `Capture package preview` action in the Release Package section.
- Capture creates one `ReleasePackage` header with status `PREVIEW`.
- Capture links to the current FlightLeg, OperationalControlRecord,
  FlightRelease, and latest readiness snapshot when present.
- Capture creates evidence links for operational control, FlightRelease,
  readiness snapshot, manifest, W&B, locating, dispatch, airworthiness release,
  aircraft configuration, discrepancies, and deferrals.
- Capture records the current authenticated user in `capturedById`.
- Capture redirects back to FlightLeg detail with a package message or error.

## Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Runtime workflow smoke remains pending because Docker Desktop was unavailable.

## Prompt 173 Target

QA package schema, read-only preview, explicit capture, health counts, and
no-regression behavior for current release actions.

# Prompt 227: ReleasePackage Final Capture Foundation

## Summary

Prompt 227 implements explicit final ReleasePackage capture around the existing
ReleasePackage schema. It does not change `FlightRelease.status`, release
blocking behavior, or preview package capture.

## Implemented Scope

- Added `captureReleasePackageFinalAction` for explicit final package capture.
- Final capture requires `ADMIN` or `OPS`.
- Preview capture remains available to `ADMIN`, `OPS`, and `DISPATCH`.
- Final capture creates a new `ReleasePackage` row with:
  - `status = FINALIZED`.
  - `finalizedAt = now`.
  - `capturedById = currentUser.id`.
  - current operational-control, release, readiness snapshot, and evidence
    links.
- FlightLeg detail now shows separate preview and final capture actions.
- Recent package history distinguishes `PREVIEW` and `FINALIZED` packages.
- Smoke workflow coverage now creates and verifies preview and final package
  records.

## Boundaries

- No schema changes.
- No hard release blocking.
- No legal signatures.
- No override workflow.
- No provider integrations.
- No file uploads or generated package documents.
- No automatic final capture as a release-action side effect.
- No replacement of `FlightRelease`.

## Validation Target

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local DB migrate/seed
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

## Next Slice

Prompt 228 should QA the complete release backend: readiness snapshots, release
attempt snapshots, audit events, preview/final package capture, and cancel/void
behavior.

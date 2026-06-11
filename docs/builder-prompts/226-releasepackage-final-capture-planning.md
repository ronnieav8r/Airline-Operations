# Prompt 226: ReleasePackage Final Capture Planning

## Summary

Plan explicit final ReleasePackage capture for the MVP release backend. This is
planning-only. `FlightRelease` remains the release decision/status record, and
`ReleasePackage` remains the evidence bundle around that decision.

## Selected Policy

Final ReleasePackage capture should be an explicit operator action. It must not
run automatically on page load, preview capture, Mark Released, Cancel Release,
or Void Release.

Final capture should create a new package with status `FINALIZED` rather than
mutating existing preview packages. Preview packages remain historical preview
records. A finalized package is the durable MVP packet for the current evidence
state at the time of capture.

## Prompt 227 Implementation Target

- Add an explicit `Capture final package` action on FlightLeg detail near the
  existing ReleasePackage preview area.
- Require `ADMIN` or `OPS`.
- Create a new `ReleasePackage` with:
  - `status = FINALIZED`.
  - `capturedAt = now`.
  - `finalizedAt = now`.
  - `capturedById = currentUser.id`.
  - current `FlightLeg`, `OperationalControlRecord`, `FlightRelease`, latest
    readiness snapshot, and available evidence links.
- Preserve existing preview capture behavior.
- Keep `FlightRelease.status` unchanged.
- Keep release actions warning-only and available.
- Show finalized packages distinctly from preview packages in the read-only
  package history.
- Do not add schema.

## Final Capture Semantics

Final capture is a package snapshot, not a legal signature. It means an ops/admin
user intentionally captured the current release evidence bundle as the final MVP
packet for review/audit purposes.

Final capture may happen before or after `FlightRelease.status = RELEASED` during
MVP. If captured while the release is still `PLANNED`, the package should make
that status visible through the linked `FlightRelease` evidence row instead of
blocking the action.

## Boundaries

- No hard release blocking.
- No legal signature behavior.
- No override workflow.
- No provider integrations.
- No file uploads or generated PDF/document package.
- No automatic final capture as a release-action side effect.
- No replacement of `FlightRelease`.
- No destructive cleanup of preview packages.

## Validation Target For Prompt 227

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local DB migrate/seed
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`
- Capture a preview package and a final package for the same FlightLeg.
- Confirm both package records remain visible and distinguishable.
- Confirm final capture records `FINALIZED`, `finalizedAt`, and `capturedById`.
- Confirm Mark Released, Cancel Release, and Void Release behavior remains
  unchanged and warning-only.

## Assumptions

- Existing ReleasePackage schema is sufficient for MVP final capture.
- Package numbers can continue using the existing package-number helper as long
  as uniqueness remains guaranteed for repeated captures.
- ReleasePackage final capture is an audit/evidence workflow, not a regulatory
  signature workflow.

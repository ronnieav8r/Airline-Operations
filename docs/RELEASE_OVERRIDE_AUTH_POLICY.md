# Release Override and Auth Policy

Last updated: 2026-06-30

This document plans future release override, auth, role, signature, and audit
requirements. It does not implement override behavior.

## Current Decision

Do not implement release overrides yet.

The app currently has no user identity, role model, signature model, or durable
release-attempt audit trail. Without those, an override would hide risk without
capturing who accepted it and why.

Current release behavior remains warning-only.

## Release Boundary

`FlightRelease` remains the operational FlightLeg release record.

Computed aircraft maintenance serviceability is the maintenance-side input to
release readiness. `AirworthinessRelease` remains historical or
operator-specific evidence, but it is no longer the default everyday
maintenance gate. It is not the operational release.

Overrides should never replace missing evidence. They should record an approved
exception to a specific release-readiness finding.

## Future Roles

Use these planning roles until the auth model is designed:

- `RELEASE_ACTOR`: may attempt normal release when readiness passes.
- `OPERATIONAL_CONTROL_MANAGER`: may approve operational-control, dispatch, or
  current-information exceptions where policy allows.
- `MAINTENANCE_RELEASE_APPROVER`: may approve maintenance-side exception paths
  where policy allows.
- `ADMIN`: may configure policy, but should not bypass release rules without an
  explicit override record.

Authority class and operator policy should constrain these roles. A role that is
valid for one operator or authority should not automatically apply to another.

## Non-Overridable Blockers

These should not be overridable through the normal operations-control release
workflow until a stronger policy says otherwise:

- Missing FlightLeg.
- Missing assigned aircraft.
- Missing operational-control record.
- Missing controlling entity.
- Missing operating authority.
- Missing authority revision.
- Missing planned `FlightRelease` row.
- Missing active aircraft configuration.
- Aircraft not serviceable due to open unresolved discrepancy, AOG,
  corrected-pending-RTS, or expired deferral.

Maintenance-side exceptions should use a maintenance approval path and should
not be silently treated as operational overrides.

## Potentially Overridable Findings

These may be overridable after auth, roles, and audit capture exist:

- Manual weather evidence accepted when provider-backed evidence is unavailable.
- Manual NOTAM evidence accepted when provider-backed evidence is unavailable.
- Manual flight-plan evidence accepted when provider-backed evidence is
  unavailable.
- Baseline Part 91 missing manifest, locating, or dispatch evidence when the
  operator policy explicitly allows it.
- Stale current-information evidence when a qualified actor confirms updated
  information outside the system.
- Future deferral or limitation warnings where severity, due date, category,
  MEL/CDL/NEF, and maintenance approval policy allow an exception.

Part 91K and Part 135-style policies should be stricter by default than baseline
Part 91.

## Required Override Capture

A future override record should capture:

- FlightLeg.
- FlightRelease or release attempt.
- Blocker key.
- Readiness input category.
- Operator.
- Operating authority.
- Authority revision.
- Authority policy class.
- Original blocker severity.
- Override decision.
- Override reason.
- Supporting evidence or reference.
- Actor user.
- Actor role.
- Approval user, if second approval is required.
- Approval role, if second approval is required.
- Timestamp.
- Optional expiration or single-use scope.
- Typed attestation text or signature reference.

## Signature Direction

Start with typed attestation once auth exists. Do not implement stronger
electronic signature behavior until the product has a specific compliance
requirement and legal review.

Typed attestation should display what the actor is accepting, including the
blocker key, authority context, and release attempt.

## Audit Direction

Every future override should create an append-only audit event. Editing an
override after use should not be allowed; corrections should be recorded as a
new audit event or a void/supersede action.

The audit trail should remain readable from the FlightLeg release detail and
should be exportable later.

## Authority-Specific Direction

Use `docs/AUTHORITY_RELEASE_POLICY.md` for the current authority-specific
planning matrix.

Override strictness should vary by authority class:

- `PART_91_BASELINE`: may allow more operator-configured override paths.
- `PART_91K_FRACTIONAL`: should require stricter role and reason capture.
- `PART_135_ON_DEMAND`: should default to the strictest override policy and may
  require second approval for selected findings.

## Next Data-Model Questions

Prompt 51 planned the additive schema shape for:

- Policy profiles.
- Policy rules.
- Readiness snapshots.
- Blocker findings.
- Override records.
- Audit events.

Durable plan:

```text
docs/RELEASE_BLOCKING_DATA_MODEL_PLAN.md
```

Do not implement schema until the next implementation slice is approved.

Prompt 52 added the additive override and audit-event tables, but there is still
no override UI, auth implementation, role enforcement, signature capture, or
hard release blocking.

## Deferred

- Actual hard release blocking.
- Override UI.
- Auth implementation.
- Role and permission implementation.
- Signature implementation.
- Schema changes.
- Provider integrations.
- File uploads.
- `ReleasePackage`.

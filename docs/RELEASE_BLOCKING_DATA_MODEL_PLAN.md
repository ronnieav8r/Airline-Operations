# Release Blocking Data Model Plan

Last updated: 2026-06-07

This document plans the additive data model needed before AeroOps implements
hard FlightLeg release blocking, authority-specific policy, override records,
and release audit events.

Prompt 52 implemented this plan as an additive schema foundation with
conservative default policy/rule records. Current release behavior remains
warning-only.

## Current Decision

Do not implement hard blocking yet.

The current schema now has durable policy, snapshot, override, and audit tables
needed for future enforcement. Only policy profiles and policy rules are seeded
today. Readiness snapshots, findings, overrides, and audit events remain unused
until later workflow slices.

## Existing Boundaries

`FlightRelease` remains the operational FlightLeg release record.

`AirworthinessRelease` remains aircraft maintenance airworthiness release state.
It can be an input to FlightLeg readiness, but it is not the operational release
record.

Manual evidence tables remain the current source for manifest, W&B, locating,
dispatch, weather, NOTAM, and flight-plan readiness.

## Proposed Additive Models

Implementation status: complete for the additive schema foundation.

### ReleasePolicyProfile

Purpose: define which release policy applies to an operator or operating
authority.

Planned fields:

- `id`
- `operatorId`
- `operatingAuthorityId`
- `name`
- `authorityClass`
- `isDefault`
- `effectiveFrom`
- `effectiveTo`
- `createdAt`
- `updatedAt`

Notes:

- `authorityClass` should align with planning classes from
  `docs/AUTHORITY_RELEASE_POLICY.md`.
- The model should support one default profile per operator or authority.
- Future policy UI can manage these records, but Prompt 52 should seed only
  conservative defaults if schema is approved.

### ReleasePolicyRule

Purpose: define one readiness rule under a policy profile.

Planned fields:

- `id`
- `profileId`
- `ruleKey`
- `readinessCategory`
- `severity`
- `isOverridable`
- `requiresSecondApproval`
- `manualEvidenceAllowed`
- `providerEvidenceRequired`
- `effectiveFrom`
- `effectiveTo`
- `createdAt`
- `updatedAt`

Notes:

- `ruleKey` should use stable keys such as `manifest.missing`,
  `weightBalance.missing`, or `airworthinessRelease.expired`.
- `severity` should support at least `BLOCK`, `WARN`, and `INFO`.
- Rules should be effective-dated rather than edited silently after release
  attempts exist.

### ReleaseReadinessSnapshot

Purpose: store what the app evaluated at a release attempt.

Planned fields:

- `id`
- `flightLegId`
- `flightReleaseId`
- `policyProfileId`
- `snapshotStatus`
- `evaluatedAt`
- `evaluatedById`
- `authorityClass`
- `summary`
- `createdAt`

Notes:

- The snapshot is the bridge between live evidence and the release decision.
- It should preserve counts for blockers, warnings, overrides, and ready items.
- `evaluatedById` can remain nullable until auth exists.

### ReleaseReadinessFinding

Purpose: store each readiness finding captured by a snapshot.

Planned fields:

- `id`
- `snapshotId`
- `ruleId`
- `ruleKey`
- `readinessCategory`
- `severity`
- `status`
- `isOverridable`
- `summary`
- `evidenceRefType`
- `evidenceRefId`
- `details`
- `createdAt`

Notes:

- Findings should attach to the snapshot, not directly to a mutable live query.
- `ruleKey` and `severity` should be copied onto the finding so historical
  reports survive later policy edits.
- `details` can be JSON for the first implementation, because evidence types
  vary across manifest, W&B, locating, dispatch, airworthiness, and crew.

### ReleaseOverride

Purpose: record an approved exception to a specific blocker finding.

Planned fields:

- `id`
- `findingId`
- `flightLegId`
- `flightReleaseId`
- `policyProfileId`
- `decision`
- `reason`
- `supportingReference`
- `actorUserId`
- `actorRole`
- `approvedById`
- `approvedRole`
- `attestationText`
- `signatureRef`
- `expiresAt`
- `createdAt`
- `voidedAt`
- `voidReason`

Notes:

- Overrides should attach to a finding. They should not broadly bypass an
  entire FlightLeg.
- `actorUserId` and `approvedById` can be nullable only until auth exists.
- Used overrides should not be edited; corrections should create void/supersede
  audit events.

### ReleaseAuditEvent

Purpose: provide append-only release decision history.

Planned fields:

- `id`
- `flightLegId`
- `flightReleaseId`
- `snapshotId`
- `overrideId`
- `eventType`
- `actorUserId`
- `actorRole`
- `message`
- `metadata`
- `createdAt`

Notes:

- Audit events should be append-only.
- Events should cover release attempted, readiness evaluated, blocker found,
  override requested, override approved, override voided, release blocked,
  release completed, release cancelled, and release voided.
- `metadata` can be JSON for first implementation.

## Proposed Planning Enums

These are planning-only names until schema is approved:

- `ReleaseAuthorityClass`: `PART_91_BASELINE`, `PART_91K_FRACTIONAL`,
  `PART_135_ON_DEMAND`.
- `ReleaseRuleSeverity`: `BLOCK`, `WARN`, `INFO`.
- `ReleaseFindingStatus`: `PASS`, `FAIL`, `WARNING`, `OVERRIDDEN`,
  `NOT_APPLICABLE`.
- `ReleaseSnapshotStatus`: `PASS`, `BLOCKED`, `WARNING_ONLY`.
- `ReleaseOverrideDecision`: `APPROVED`, `DENIED`, `VOIDED`, `SUPERSEDED`.
- `ReleaseAuditEventType`: `READINESS_EVALUATED`, `BLOCKER_FOUND`,
  `OVERRIDE_APPROVED`, `OVERRIDE_VOIDED`, `RELEASE_BLOCKED`,
  `RELEASE_COMPLETED`, `RELEASE_CANCELLED`, `RELEASE_VOIDED`.

## Relationship Sketch

```text
Operator -> ReleasePolicyProfile
OperatingAuthority -> ReleasePolicyProfile
ReleasePolicyProfile -> ReleasePolicyRule
FlightLeg -> ReleaseReadinessSnapshot
FlightRelease -> ReleaseReadinessSnapshot
ReleaseReadinessSnapshot -> ReleaseReadinessFinding
ReleaseReadinessFinding -> ReleaseOverride
FlightLeg -> ReleaseAuditEvent
FlightRelease -> ReleaseAuditEvent
```

## Implementation Order If Approved

1. Add schema foundation with nullable user links and no enforcement. Complete.
2. Seed conservative default policy profiles and rules for demo/local data. Complete.
3. Add hidden diagnostic showing resolved policy and rule counts. Complete.
4. Run release-policy diagnostic QA. Complete.
5. Plan explicit preview snapshot creation. Complete.
6. Add readiness snapshot creation in preview mode only. Complete.
7. Add hard blocking only after auth/override decisions are resolved. Deferred.

## Deferred

- Hard release blocking.
- Automatic release-attempt snapshot creation.
- Readiness snapshot creation outside explicit preview action.
- Readiness finding creation outside explicit preview action.
- Override workflow.
- Auth, roles, permissions, and signatures.
- Provider-backed evidence verification.
- File uploads.
- `ReleasePackage`.
- Crew compliance enforcement.
- MEL/CDL legal interpretation.

# Release Blocking Policy

Last updated: 2026-06-07

This document defines the first planning boundary for future FlightLeg release
blocking.

## Current Decision

Keep current production behavior warning-only.

FlightLeg detail may show readiness concerns, but `FlightRelease` actions
remain available. Prompt 46 does not implement hard blocking.

## Release Record Boundary

`FlightRelease` is the operational FlightLeg release record.

`AirworthinessRelease` is aircraft maintenance airworthiness release state. It
is an input to FlightLeg readiness, not a replacement for `FlightRelease`.

## Current Readiness Inputs

The current FlightLeg release readiness checklist covers:

- Manifest.
- Weight and balance.
- Flight locating.
- Dispatch package.
- Weather briefing.
- NOTAM snapshot.
- Flight plan reference.
- Aircraft configuration.
- Aircraft maintenance airworthiness release.
- Open/deferred discrepancies.
- Active deferrals.

## Future Blocking Classification

The recommended first enforcement model should classify readiness findings into
two buckets:

- `WOULD_BLOCK`: should prevent a normal release in a later enforcement slice.
- `WOULD_WARN`: should remain visible but not block until richer policy exists.

Prompt 47 should preview this classification in the UI without enforcing it.

## Recommended Future Blockers

These should likely become hard blockers for normal release:

- Missing FlightLeg.
- Missing operational control record.
- Missing planned `FlightRelease` row.
- Missing assigned aircraft.
- Missing controlling entity.
- Missing operating authority.
- Missing authority revision.
- Missing manifest.
- Manifest has no items.
- Manifest status is not `READY` or `LOCKED`.
- Missing latest non-voided weight-and-balance run.
- Latest non-voided W&B run is not `CALCULATED` or `APPROVED`.
- Missing flight locating record.
- Flight locating status is not `FILED`, `ACTIVE`, or `CLOSED`.
- Missing dispatch package.
- Missing weather briefing evidence.
- Missing NOTAM evidence.
- Missing flight-plan reference.
- Missing weather route summary.
- Missing NOTAM affected station codes.
- Missing flight-plan external reference or route text.
- Missing active aircraft configuration.
- Missing current `RELEASED` aircraft airworthiness release.
- Expired current aircraft airworthiness release.

## Recommended Future Warnings

These should remain warnings for now:

- Open discrepancies, until severity/category policy is defined.
- Active deferrals, until MEL/CDL, due-date, and category policy is defined.
- Manual weather evidence, if required fields are present.
- Manual NOTAM evidence, if required fields are present.
- Manual flight-plan evidence, if required fields are present.
- Superseded, voided, or draft airworthiness release history when a current
  non-expired `RELEASED` aircraft release exists.
- Missing crew qualification, recency, duty, or rest checks until richer crew
  compliance tables exist.
- Missing provider-backed verification, because provider integrations are not
  implemented yet.

## Authority-Specific Policy Gaps

These likely need authority-specific rules before hard enforcement:

- Part 91 release strictness for dispatch package evidence.
- Part 91K release strictness for manifest, locating, operational-control, and
  scheduling/release procedure evidence.
- Part 135 release strictness for dispatch/current-information evidence.
- Whether a release may proceed with manual weather/NOTAM/flight-plan evidence.
- Which discrepancy severity or category blocks release.
- Which deferral category, due date, or MEL/CDL status blocks release.
- Who may override a blocker.
- What an override must record.

Prompt 49 planned the first authority-specific release policy matrix in:

```text
docs/AUTHORITY_RELEASE_POLICY.md
```

Current direction:

- Use shared future blockers for assigned aircraft, aircraft configuration,
  current aircraft maintenance airworthiness release, operational-control
  context, authority/revision, planned `FlightRelease`, and current W&B.
- Keep baseline Part 91 strictness configurable for manifest, locating,
  dispatch, weather, NOTAM, and flight-plan evidence.
- Treat Part 91K and Part 135-style operations as stricter planning classes for
  manifest, locating, dispatch/current-information, operational-control, and
  aircraft airworthiness readiness.
- Keep discrepancy and deferral blocking deferred until severity, due-date,
  category, and MEL/CDL policy exists.

Prompt 51 planned the future release-blocking data model in:

```text
docs/RELEASE_BLOCKING_DATA_MODEL_PLAN.md
```

The current schema is sufficient for warning-only preview. Hard blocking should
wait for additive policy profile, policy rule, readiness snapshot, finding,
override, and audit-event records.

Prompt 52 added those records as an additive schema foundation. The app now
stores default release policy profiles and rules, but it still does not enforce
hard blocking or create release readiness snapshots/findings.

Prompt 53 validated the release policy defaults and diagnostic route in:

```text
docs/RELEASE_POLICY_QA_LOG.md
```

Prompt 54 planned explicit preview snapshots in:

```text
docs/RELEASE_SNAPSHOT_POLICY.md
```

Preview snapshots must be user-triggered from FlightLeg detail and must not
change release status or enforce blocking.

## Override Policy

Do not implement overrides yet.

Override behavior should wait until user identity, roles, and signature policy
exist. Without auth, the app cannot responsibly capture who accepted a release
risk.

Prompt 50 planned the future override/auth policy in:

```text
docs/RELEASE_OVERRIDE_AUTH_POLICY.md
```

Current direction:

- Overrides require user identity, role, timestamp, reason, authority context,
  blocker key, and audit capture.
- Overrides are exception records, not evidence replacements.
- Missing FlightLeg, aircraft, operational-control context, authority/revision,
  planned `FlightRelease`, active aircraft configuration, and current aircraft
  maintenance airworthiness release should be non-overridable in the normal
  operations-control workflow until stronger policy exists.
- Manual weather, NOTAM, flight-plan, and selected baseline Part 91 evidence
  gaps may become overridable only after auth, roles, and audit capture exist.

## Prompt 47 Status

Prompt 47 implemented a read-only release-blocking preview.

Implemented behavior:

- Add `Would block release` or `Would warn` labels to FlightLeg readiness
  findings.
- Add `No blocker` labels for currently ready items.
- Show preview totals for would-block and would-warn findings.
- Keep release action buttons available.
- Do not prevent `FlightRelease` mutations.
- Do not mutate evidence.
- Do not add schema.
- Do not add overrides.

This lets the operator validate the policy visually before the app starts
enforcing it. Prompt 48 should run focused QA on this preview before any
authority-specific policy planning or hard-blocking implementation.

## Prompt 48 Status

Prompt 48 validated the non-enforcing release-blocking preview.

Validation confirmed:

- FlightLeg detail renders Release Readiness.
- FlightLeg detail renders release-blocking preview markers.
- Release Control remains visible.
- Mark released, cancel release, and void release still mutate
  `FlightRelease.status`.
- The preview does not block release actions.

Durable QA log:

```text
docs/RELEASE_BLOCKING_QA_LOG.md
```

## Deferred

- Actual hard release blocking.
- Readiness snapshot and finding creation.
- Override workflow.
- Auth, roles, user identity, and signatures.
- Authority-specific policy engine.
- Operator-configurable policy UI.
- MEL/CDL legal interpretation.
- Crew compliance enforcement.
- Provider integrations.
- File uploads.
- `ReleasePackage`.

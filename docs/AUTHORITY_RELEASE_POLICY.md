# Authority Release Policy

Last updated: 2026-06-30

This document plans how FlightLeg release-readiness policy should vary by
operating authority. It is product planning, not legal advice.

## Regulatory Reference Anchors

Use these current eCFR pages as starting points when reviewing policy:

- 14 CFR Part 91 general operating and flight rules:
  https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91
- 14 CFR Part 91 Subpart K fractional ownership operations:
  https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-K
- 14 CFR Part 135 commuter and on-demand operations:
  https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135
- AeroOps research report:
  `docs/airline.ops.research.report.md`

Before hard enforcement, an operator-specific compliance review should confirm
which items are mandatory for the actual certificate, manuals, OpSpecs, aircraft
type, and mission profile.

## Current App Behavior

Current release behavior remains warning-only.

FlightLeg detail may preview `Would block release` and `Would warn` findings,
but `FlightRelease` actions still remain available. No authority-specific
policy engine exists yet.

## Authority Classes

Use these planning classes until the schema has a policy profile model:

- `PART_91_BASELINE`: private or non-commercial baseline operations.
- `PART_91K_FRACTIONAL`: fractional ownership operations.
- `PART_135_ON_DEMAND`: commuter or on-demand operations.

These classes are planning labels. They do not replace the existing
`OperatingAuthority.operatingPart` value or the authority revision records.

## Shared Future Blockers

These should be considered hard blockers for normal release across all authority
classes once enforcement exists:

- Missing FlightLeg.
- Missing assigned aircraft.
- Missing active aircraft configuration.
- Aircraft not serviceable due to open unresolved discrepancy, AOG,
  corrected-pending-RTS, or expired deferral.
- Missing operational-control record.
- Missing controlling entity.
- Missing operating authority.
- Missing authority revision.
- Missing planned `FlightRelease` row.
- Missing latest non-voided weight-and-balance run.
- Latest non-voided W&B run is not `CALCULATED` or `APPROVED`.

The app can still show these as warning-only until a later hard-blocking slice.

## Authority-Specific Matrix

| Readiness input | PART_91_BASELINE | PART_91K_FRACTIONAL | PART_135_ON_DEMAND |
| --- | --- | --- | --- |
| Assigned aircraft | Future blocker | Future blocker | Future blocker |
| Aircraft configuration | Future blocker | Future blocker | Future blocker |
| Aircraft maintenance serviceability | Future blocker | Future blocker | Future blocker |
| Operational control record | Future blocker | Future blocker | Future blocker |
| Controlling entity | Future blocker | Future blocker | Future blocker |
| Operating authority/revision | Future blocker | Future blocker | Future blocker |
| Planned FlightRelease | Future blocker | Future blocker | Future blocker |
| Manifest exists and is ready | Operator-configurable blocker | Future blocker | Future blocker |
| Manifest has items | Operator-configurable blocker | Future blocker | Future blocker |
| Weight and balance current | Future blocker | Future blocker | Future blocker |
| Flight locating record | Operator-configurable blocker or warning | Future blocker | Future blocker |
| Dispatch package exists | Operator-configurable blocker or warning | Future blocker | Future blocker |
| Weather briefing evidence | Operator-configurable blocker or warning | Future blocker | Future blocker |
| NOTAM evidence | Operator-configurable blocker or warning | Future blocker | Future blocker |
| Flight-plan reference | Operator-configurable blocker or warning | Future blocker | Future blocker |
| Open unresolved discrepancies / RTS required | Future blocker | Future blocker | Future blocker |
| Active valid deferrals with limitations | Warning until due-date/MEL/CDL/NEF policy exists | Warning until due-date/MEL/CDL/NEF policy exists | Warning until due-date/MEL/CDL/NEF policy exists |
| Crew compliance | Deferred warning until richer crew tables exist | Deferred warning until richer crew tables exist | Deferred warning until richer crew tables exist |

## Part 91 Baseline Direction

For baseline Part 91 use, the product should not assume every dispatch-style
evidence item is always a hard blocker. The first enforcement version should
make manifest, locating, dispatch package, weather, NOTAM, and flight-plan
strictness operator-configurable.

Product safety default can still preview these items prominently so operators
see missing evidence before release.

## Part 91K Fractional Direction

For Part 91K-style fractional operations, the product should move toward
stricter readiness. Manifest, locating, current information, operational-control
context, authority revision, aircraft airworthiness, and release procedure
evidence should normally become blockers unless an operator-specific policy says
otherwise.

## Part 135 On-Demand Direction

For Part 135-style operations, release readiness should be the strictest
planning class. Manifest/load context, W&B, locating, current information,
dispatch package, weather, NOTAM, flight-plan evidence, aircraft airworthiness,
and operational-control context should normally become blockers.

## Manual Evidence Policy

Manual evidence remains acceptable for now because provider integrations are
deferred.

When hard blocking is added, the first policy should distinguish between:

- Missing evidence.
- Present manual evidence with required fields.
- Provider-backed evidence.
- Provider-backed evidence that is stale or failed verification.

Manual evidence can satisfy early enforcement if required fields are present,
but the UI should continue to show that the evidence is manually entered.

## Deferred Decisions

- Actual hard release blocking.
- Override workflow.
- Auth, roles, user identity, and signatures.
- Authority-specific policy engine schema.
- Operator-configurable policy UI.
- Legal interpretation for MEL/CDL and certificate-specific procedures.
- Crew compliance enforcement.
- Provider integrations for weather, NOTAM, and flight-plan data.
- File uploads.
- `ReleasePackage`.

## Next Slice

Prompt 50 planned release override, auth, role, and signature policy in:

```text
docs/RELEASE_OVERRIDE_AUTH_POLICY.md
```

Prompt 51 should plan the additive data model needed for authority policy,
readiness snapshots, override records, and audit events.

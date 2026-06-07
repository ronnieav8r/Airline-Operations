# Prompt 49: Authority-Specific Release Policy Planning

## Summary

Plan how FlightLeg release-blocking policy should vary by operating authority.

This is a docs/planning slice only. Do not add schema, code enforcement, auth,
signatures, overrides, provider integrations, file uploads, or new evidence
mutation.

## Source Context

Use these as regulatory-reference anchors, not as a complete legal analysis:

- 14 CFR Part 91 general operating and flight rules:
  https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91
- 14 CFR Part 91 Subpart K fractional ownership operations:
  https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-K
- 14 CFR Part 135 commuter and on-demand operations:
  https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135
- Existing AeroOps research report:
  `docs/airline.ops.research.report.md`.

## Planning Goal

Define a first product policy matrix for release readiness by authority class:

- `PART_91_BASELINE`
- `PART_91K_FRACTIONAL`
- `PART_135_ON_DEMAND`

## Policy Direction

Use the strictest shared baseline for safety-critical items, then layer
authority-specific strictness on top.

Durable policy output:

```text
docs/AUTHORITY_RELEASE_POLICY.md
```

Shared future blockers:

- Missing assigned aircraft.
- Missing active aircraft configuration.
- Missing current non-expired aircraft maintenance airworthiness release.
- Missing operational control record.
- Missing controlling entity.
- Missing operating authority and authority revision.
- Missing planned `FlightRelease` row.
- Missing or stale weight-and-balance evidence.

Part 91 baseline:

- Keep assigned aircraft, active aircraft configuration, current non-expired
  aircraft maintenance airworthiness release, W&B, operational control context,
  and `FlightRelease` presence as shared future blockers.
- Treat manifest, locating, dispatch package, weather, NOTAM, and flight-plan
  evidence as visible readiness inputs. Actual blocking can be
  operator-configurable for private Part 91 use until product policy is
  finalized.

Part 91K fractional:

- Treat manifest, locating, operating authority/revision, operational-control
  acknowledgment, and dispatch/current-information evidence as normal future
  blockers.
- Treat aircraft maintenance airworthiness release as a normal future blocker.
- Keep discrepancy/deferral blocking deferred until MEL/CDL/category policy
  exists.

Part 135 on-demand:

- Treat manifest, W&B, locating, dispatch/current-information evidence,
  operational-control context, and aircraft airworthiness context as normal
  future blockers.
- Treat missing or incomplete weather/NOTAM/flight-plan evidence as normal
  future blockers for release preview.
- Keep discrepancy/deferral blocking deferred until severity/category/MEL/CDL
  policy exists.

## Prompt 50 Target

Prompt 50 should plan release override and auth/signature requirements before
any actual hard-blocking implementation.

Minimum questions:

- Who can override a release blocker?
- Which blockers can never be overridden?
- What override reason/evidence must be captured?
- What user identity, role, timestamp, and signature fields are required?
- Whether override policy differs by authority class.
- Whether override records need schema before enforcement.

## Deferred

- Actual hard release blocking.
- Override workflow implementation.
- Auth, roles, user identity, and signatures.
- Authority-specific policy engine implementation.
- Operator-configurable policy UI.
- MEL/CDL legal interpretation.
- Crew compliance enforcement.
- Provider integrations.
- File uploads.
- `ReleasePackage`.

## Validation

Docs-only slice:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

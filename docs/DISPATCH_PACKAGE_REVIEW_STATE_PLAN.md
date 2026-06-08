# Dispatch Package Review State Plan

## Purpose

The current dispatch workflow lets an operator save manual weather, NOTAM,
flight-plan, and package/performance notes. It does not yet distinguish a
partially drafted package from one that has been prepared and reviewed.

The next dispatch-package step should add a lightweight review state so the UI
can show operational progress without turning dispatch evidence into the final
FlightLeg release.

## Current State

- `DispatchPackage` is one-to-one with `FlightLeg`.
- It links one weather briefing snapshot, one NOTAM snapshot, and one
  flight-plan reference.
- Manual dispatch evidence is saved at
  `/operations-control/[flightLegId]/dispatch`.
- Release readiness treats dispatch as ready when the package exists and links
  weather, NOTAM, and flight-plan evidence.
- There is no dispatch status, ready timestamp, reviewed timestamp, reviewer,
  or void state.

## Chosen First Policy

Add status fields directly to `DispatchPackage`.

Use these statuses:

- `DRAFT`: Dispatch evidence exists but has not been marked ready.
- `READY`: Required manual evidence is complete enough for review.
- `REVIEWED`: A human reviewed the ready package; this is not a legal
  signature.
- `VOIDED`: The package was entered in error or should be ignored.

## Required Evidence For READY

The first READY action should require:

- Weather route summary.
- NOTAM affected station codes.
- Flight-plan external reference.
- Flight-plan route text.

This intentionally matches the current warning-first dispatch readiness
criteria.

## Workflow Rules

- Saving dispatch evidence creates or updates the package as `DRAFT` by
  default.
- Saving a `REVIEWED` package resets it to `DRAFT`.
- Mark Ready rejects incomplete evidence.
- Mark Reviewed rejects packages that are not `READY`.
- Mark Reviewed sets `reviewedAt`.
- `reviewedById` stays null until auth exists.
- Void sets `VOIDED` and `voidedAt`.
- Voided packages should not count as dispatch-ready in later readiness work,
  but Prompt 75 should keep release behavior warning-only.

## Deferred

- Auth and role checks.
- Legal signatures.
- Review/audit history table.
- File uploads.
- Provider-backed weather, NOTAM, or flight-plan evidence.
- `ReleasePackage`.
- Hard release blocking.
- Automatic snapshots when review state changes.

## Prompt 75 Implementation Target

Prompt 75 should add the additive schema fields and first manual status
actions. It should not add dispatch release authority, hard blockers, provider
integrations, file uploads, or auth.

## Prompt 75 Implementation Status

Implementation status: complete.

`DispatchPackage` now has additive review-state fields and the dispatch page
supports Mark Ready, Mark Reviewed, and Void actions. READY uses the same
required manual evidence as warning-only dispatch readiness. REVIEWED is a
workflow state only, not a legal signature. Voided packages are ignored by
dispatch readiness warnings, but release actions remain warning-only and
unchanged.

Prompt 76 should be a QA/docs slice for the new dispatch review-state workflow.

## Prompt 77 Implementation Status

Implementation status: complete.

The FlightLeg detail Release Evidence Action Panel now surfaces dispatch
review state and ready/reviewed/voided timestamp context. This is display-only;
release readiness and release actions remain warning-only and unchanged.

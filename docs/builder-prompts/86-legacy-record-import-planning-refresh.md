# Prompt 86: Legacy Record Import Planning Refresh

## Summary

Refresh legacy record import planning against the current AeroOps data model and
workflow state. This is a planning/docs-only slice.

## Current Decision

Do not implement importer execution yet.

The first import domain should remain aircraft maintenance and airworthiness
history because those workflows now exist and are less entangled than completed
flight, release, crew compliance, manifest, or dispatch history.

## Updated First-Domain Targets

Candidate aircraft maintenance/airworthiness import targets:

- Aircraft identity mapping.
- Historical maintenance events.
- Historical discrepancies.
- Historical deferrals.
- Historical aircraft airworthiness releases.
- Source references for scanned logs, export rows, or maintenance tracking
  records.

## Current Model Fit

The current schema already has operational target tables for the first
candidate domain:

- `Aircraft`
- `MaintenanceEvent`
- `Discrepancy`
- `Deferral`
- `AirworthinessRelease`

However, import staging, source-file references, batch review, idempotency
keys, and rejected-row storage are not implemented yet.

## Prompt 87 Target

Prompt 87 should plan the staging/dry-run foundation:

- Whether staging should use database tables, local files, or both.
- Minimal fields for `ImportBatch`, source file metadata, staging rows, and
  validation results.
- Idempotency key strategy.
- Dry-run summary shape.
- Review/approval boundary before operational writes.
- Which implementation remains deferred.

## Stop Conditions

Stop before implementation if:

- Source formats are unknown.
- Target mapping is ambiguous.
- Import requires file uploads.
- Import requires auth/signatures.
- Import requires destructive cleanup.
- Import would write operational records before staging/dry-run policy is
  approved.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app.
- Confirm `/`, `/operations-control`, `/aircraft`, `/api/health`, and main
  routes still load.

## Assumptions

- Prompt 86 does not add schema or importer execution code.
- Legacy import remains deferred until staging/dry-run policy is decided.

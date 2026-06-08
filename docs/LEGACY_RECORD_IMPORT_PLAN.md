# Legacy Record Import Plan

Last updated: 2026-06-07

This document tracks the future need to import old operational, aircraft,
maintenance, crew, and release records into AeroOps.

## Current Status

Deferred. Do not implement import tooling yet.

The app is still defining core operational write workflows. Importing historical
records should wait until the target tables and transition policies are stable
enough to avoid re-importing or reshaping the same data multiple times.

Prompt 69 selected a staging plus dry-run direction. Imports should not write
directly into operational tables until source formats, idempotency keys,
validation rules, and review behavior are defined.

Prompt 86 refresh: import execution remains deferred. The first import domain
should still be aircraft maintenance and airworthiness history because the
target workflows now exist and are less entangled than completed FlightLeg,
crew compliance, manifest, dispatch, or release history imports.

## Goal

Create a controlled import method for old records that can:

- Accept exported legacy data in a predictable format.
- Validate rows before writing them.
- Map legacy fields to current AeroOps records.
- Preserve source-system references for audit and troubleshooting.
- Run safely in local/staging before any Render production import.
- Avoid broad destructive cleanup.
- Show dry-run counts, warnings, and rejected rows before operational writes.
- Preserve import batch and source row references for every imported record.

## Likely Import Sources

Possible old-record sources may include:

- Bubble exports.
- CSV/XLSX exports.
- Maintenance logs.
- Aircraft discrepancy/deferral history.
- Flight schedules or completed trip records.
- Crew assignment or qualification records.
- Passenger/manifest records.
- Dispatch/release evidence records.

## First Candidate Domain

The first practical import domain should be aircraft maintenance and
airworthiness history.

This is useful early and less entangled than completed flight history, release
records, crew compliance, or manifest history.

Expected first-domain mapping areas:

- Aircraft identity mapping.
- Maintenance event date/type/description.
- Discrepancy references when available.
- Deferral references when available.
- Airworthiness-release references when available.
- Source document references.

Current target tables that can receive this domain after staging policy is
approved:

- `Aircraft`
- `MaintenanceEvent`
- `Discrepancy`
- `Deferral`
- `AirworthinessRelease`

Still missing by design:

- Import staging records.
- Source file metadata.
- Batch-level dry-run summaries.
- Row-level validation results.
- Idempotency key policy.
- Review/approval boundary before operational writes.

## Proposed Future Slices

```text
Prompt 86: Legacy record import planning refresh
```

Planning-only. Decide source formats, import boundaries, idempotency keys,
validation rules, dry-run output, and which legacy records should be imported
first.

```text
Prompt 87: Legacy import staging/dry-run planning
```

Planning-only. Decide whether staging should use database tables, local files,
or both; define batch/source/staging-row concepts; define validation result and
dry-run summary shape; keep importer execution deferred.

```text
Prompt X: Legacy import staging foundation
```

Add non-production import staging tables or files if needed. Do not write into
operational tables yet unless the planning slice proves staging is unnecessary.

```text
Prompt X+2: Aircraft maintenance history import
```

First practical import candidate. Import historical discrepancies, deferrals,
and maintenance events into the aircraft airworthiness model after the current
maintenance workflow stabilizes.

```text
Prompt X+3: FlightLeg history import
```

Import historical or completed flight/trip records only after FlightLeg has
fully replaced legacy `Flight` as the operational anchor.

## Future Import Flow

Recommended import workflow:

1. Upload or place source file.
2. Parse into staging rows.
3. Show dry-run counts, warnings, and rejected rows.
4. Let a reviewer approve an import batch.
5. Write operational records with source references and idempotency keys.
6. Store import summary and rejected-row details.

## Future Data Concepts

Likely future tables:

- `ImportBatch`
- `ImportSourceFile`
- `ImportStagingRow`
- `ImportMappingRule`
- `ImportReviewDecision`
- Source reference fields on imported operational records

## Import Policy

- Every imported row should keep a source reference such as source system,
  source file, source row number, and source external id when available.
- Import should support dry-run validation before writing.
- Import should be idempotent where possible.
- Import should produce readable errors for skipped or invalid rows.
- Import should never run automatically during normal Render deploys.
- Import should not run broad seed cleanup.
- Import should require review before operational writes.

## Deferred Until

Do not start implementation until:

- Import staging/dry-run policy is approved.
- Source data format is known.
- Import idempotency keys are defined.
- Review behavior before operational writes is defined.
- Core aircraft airworthiness workflows remain stable.
- FlightLeg transition policy is further along.

## Stop Conditions

Stop before implementation if:

- Source data is not available or not well understood.
- The target table mapping is ambiguous.
- Import requires destructive cleanup.
- Production data could be overwritten.
- Auth, signatures, or legal audit policy must be solved first.

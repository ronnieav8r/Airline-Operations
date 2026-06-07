# Legacy Record Import Plan

Last updated: 2026-06-07

This document tracks the future need to import old operational, aircraft,
maintenance, crew, and release records into AeroOps.

## Current Status

Deferred. Do not implement import tooling yet.

The app is still defining core operational write workflows. Importing historical
records should wait until the target tables and transition policies are stable
enough to avoid re-importing or reshaping the same data multiple times.

## Goal

Create a controlled import method for old records that can:

- Accept exported legacy data in a predictable format.
- Validate rows before writing them.
- Map legacy fields to current AeroOps records.
- Preserve source-system references for audit and troubleshooting.
- Run safely in local/staging before any Render production import.
- Avoid broad destructive cleanup.

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

## Proposed Future Slices

```text
Prompt X: Legacy import planning
```

Planning-only. Decide source formats, import boundaries, idempotency keys,
validation rules, dry-run output, and which legacy records should be imported
first.

```text
Prompt X+1: Legacy import staging foundation
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

## Import Policy

- Every imported row should keep a source reference such as source system,
  source file, source row number, and source external id when available.
- Import should support dry-run validation before writing.
- Import should be idempotent where possible.
- Import should produce readable errors for skipped or invalid rows.
- Import should never run automatically during normal Render deploys.
- Import should not run broad seed cleanup.

## Deferred Until

Do not start implementation until:

- Airworthiness release policy is planned.
- Core aircraft airworthiness workflows are stable.
- FlightLeg transition policy is further along.
- The expected source data format is known.
- A staging or dry-run strategy is selected.

## Stop Conditions

Stop before implementation if:

- Source data is not available or not well understood.
- The target table mapping is ambiguous.
- Import requires destructive cleanup.
- Production data could be overwritten.
- Auth, signatures, or legal audit policy must be solved first.

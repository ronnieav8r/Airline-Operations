# Legacy Import Staging And Dry-Run Plan

Last updated: 2026-06-08

## Decision

The future legacy import foundation should use database-backed staging and
dry-run records. File uploads remain deferred. Source files can be placed or
prepared outside the app until upload and storage policy is defined.

## Why Database Staging

Database staging gives the app a durable place to store:

- import batches;
- source metadata;
- raw rows;
- mapped target candidates;
- row-level validation findings;
- idempotency keys;
- dry-run summaries;
- review decisions.

This avoids writing directly into operational tables before review.

## Future Data Concepts

Potential future tables:

- `ImportBatch`
- `ImportSource`
- `ImportStagingRow`
- `ImportValidationFinding`
- `ImportMappingDecision`

Prompt 87 does not implement these tables.

Prompt 88 status: complete. The next safe implementation path is Prompt 89
schema planning followed by Prompt 90 additive staging schema foundation.

Prompt 89 status: complete. The planned staging schema is documented in:

```text
docs/LEGACY_IMPORT_STAGING_SCHEMA_PLAN.md
```

Prompt 90 should add the planned tables additively only. It should not add
importer execution, parser code, file uploads, operational writes, review/apply
routes, auth/signatures, destructive cleanup, or provider integrations.

Prompt 90 status: complete. Additive staging schema tables now exist, and
`/api/health` exposes their counts. The tables are empty by default and remain
staging-only.

Prompt 91 status: complete. Local QA confirmed migrations, validation, build,
route smoke, browser smoke, and zero-count health diagnostics for the staging
tables. Results are recorded in:

```text
docs/LEGACY_IMPORT_QA_LOG.md
```

Prompt 92 status: complete. The first-domain source format is planned in:

```text
docs/AIRCRAFT_MAINTENANCE_IMPORT_SOURCE_FORMAT_PLAN.md
```

Prompt 93 status: complete. The first-domain dry-run mapping plan is:

```text
docs/AIRCRAFT_MAINTENANCE_IMPORT_DRY_RUN_MAPPING_PLAN.md
```

Prompt 94 status: complete. The future read-only staging diagnostic is planned
in:

```text
docs/IMPORT_STAGING_DIAGNOSTIC_PLAN.md
```

Prompt 95 status: complete. The hidden read-only route
`/internal/import-staging-readiness` now summarizes staging table diagnostics
without mutation controls.

## First Import Domain

The first domain remains aircraft maintenance and airworthiness history:

- `Aircraft`
- `MaintenanceEvent`
- `Discrepancy`
- `Deferral`
- `AirworthinessRelease`

Completed FlightLeg, crew compliance, manifest, dispatch, and release imports
remain deferred until source formats and target policies are clearer.

## Idempotency

Use a batch-independent idempotency key so the same source row can be detected
across repeated dry-runs:

```text
{importDomain}:{sourceSystem}:{sourceExternalId || sourceRowHash}
```

When available, prefer stable source IDs:

- work order or maintenance event number;
- discrepancy number;
- deferral number;
- airworthiness release number.

Use a normalized source row hash only as fallback.

## Dry-Run Summary

A dry-run should report:

- total rows;
- accepted candidate rows;
- warning rows;
- rejected rows;
- duplicate/idempotent rows;
- unmapped aircraft rows;
- missing required fields;
- target table counts by type.

## Review Boundary

No operational record should be created until a future reviewer approves a dry
run batch.

The eventual flow should be:

1. Create batch.
2. Load rows into staging.
3. Validate and map rows.
4. Present dry-run summary.
5. Review rejected/warning rows.
6. Approve operational write in a later workflow.

## Deferred

- Schema migration.
- Parser implementation.
- File upload and storage.
- Operational writes.
- Auth/signature review.
- Source-specific mapping code.
- Render import jobs.

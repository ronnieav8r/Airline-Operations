# Legacy Import Staging And Dry-Run Plan

Last updated: 2026-06-07

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

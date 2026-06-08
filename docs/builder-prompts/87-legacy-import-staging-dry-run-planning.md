# Prompt 87: Legacy Import Staging/Dry-Run Planning

## Summary

Plan the future legacy import staging and dry-run foundation. This is a
planning/docs-only slice. Do not add schema, importer execution code, file
uploads, auth/signatures, or operational writes.

## Decision

Use database-backed staging tables for the eventual implementation, with local
file/manual source placement handled outside the app until a file-upload policy
exists.

Rationale:

- Database staging supports batch review, repeatable dry-runs, row-level
  validation, and idempotency.
- File uploads are intentionally deferred.
- Operational writes should happen only after a reviewed import batch is
  explicitly approved in a later workflow.

## Future Concepts

Future schema candidates:

- `ImportBatch`
- `ImportSource`
- `ImportStagingRow`
- `ImportValidationFinding`
- `ImportMappingDecision`

Do not implement these in Prompt 87.

## Minimum Future Fields

`ImportBatch`:

- id
- importDomain
- status
- sourceSystem
- createdAt
- reviewedAt
- summary JSON

`ImportSource`:

- id
- batchId
- sourceName
- sourceType
- sourceHash
- notes

`ImportStagingRow`:

- id
- batchId
- sourceId
- sourceRowNumber
- sourceExternalId
- idempotencyKey
- rawRow JSON
- mappedTargetType
- mappedTargetKey
- validationStatus
- validationSummary JSON

`ImportValidationFinding`:

- id
- stagingRowId
- severity
- code
- message
- fieldName

`ImportMappingDecision`:

- id
- stagingRowId
- decision
- targetType
- targetId
- reason

## Dry-Run Output

The dry-run summary should include:

- total rows
- accepted candidate rows
- warning rows
- rejected rows
- duplicate/idempotent rows
- unmapped aircraft rows
- missing required fields
- target table counts by type

## Idempotency Strategy

First candidate idempotency key:

```text
{importDomain}:{sourceSystem}:{sourceExternalId || sourceRowHash}
```

For aircraft maintenance/airworthiness history, target-specific keys should
prefer stable source identifiers when available:

- maintenance event number or work order
- discrepancy number
- deferral number
- airworthiness release number
- source row hash as fallback

## Review Boundary

Future import flow should be:

1. Create import batch.
2. Load source rows into staging.
3. Run validation/dry-run.
4. Review summary and rejected rows.
5. Approve batch for operational writes in a later workflow.
6. Write operational records with source references.

Prompt 87 does not implement any of these steps.

## Deferred

- Import execution.
- File uploads.
- Operational writes.
- Auth/signature review.
- Schema migration.
- Parser implementation.
- Source-specific mapping code.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app.
- Confirm `/`, `/operations-control`, `/aircraft`, `/api/health`, and main
  routes still load.

## Assumptions

- The first future import implementation should start with database staging,
  not direct operational writes.
- Actual source formats are not known yet.

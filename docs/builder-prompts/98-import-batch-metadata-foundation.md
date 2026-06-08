# Prompt 98: Import Batch Metadata Foundation

## Summary

Implement the metadata-only import batch/source workflow planned in Prompt 97.

Do not add parser code, importer execution, file uploads, staging-row writes,
dry-run execution, review/apply route handlers, auth/signatures, destructive
cleanup, provider integrations, source-specific mapping code, or operational
writes.

## Implemented Changes

- Added hidden internal route:

```text
/internal/import-batches
```

- Added metadata-only server actions:
  - create `ImportBatch`
  - update `ImportBatch`
  - create `ImportSource`
- Added a link from `/internal/import-staging-readiness` to
  `/internal/import-batches`.

## Boundaries

The workflow writes only:

- `ImportBatch`
- `ImportSource`

It does not create:

- `ImportStagingRow`
- `ImportValidationFinding`
- `ImportMappingDecision`
- operational target records

## Validation

- Import domain is required.
- Source system is required for batch metadata.
- Duplicate batch keys return a readable error.
- Source name and source type are required for source metadata.
- Source metadata must belong to an existing batch.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app.
- Create a metadata-only import batch.
- Edit the batch metadata.
- Add source metadata.
- Confirm `/internal/import-staging-readiness` counts update.
- Confirm staging rows, findings, and mapping decisions remain zero.
- Smoke-check `/`, `/operations-control`, `/aircraft`, `/api/health`,
  `/flights`, `/crew`, and `/scheduling`.

## Assumptions

- No auth exists, so user attribution remains null.
- Prompt 99 should QA this workflow and keep the slice QA/docs-only unless a
  defect is found.

# Prompt 97: Import Batch Metadata Planning

## Summary

Plan the first metadata-only import staging write workflow before
implementation.

Do not add parser code, importer execution, file uploads, staging-row writes,
dry-run execution, review/apply workflow, auth/signatures, destructive cleanup,
provider integrations, source-specific mapping code, or operational writes.

## Decision

Prompt 98 should implement a hidden internal metadata workflow at:

```text
/internal/import-batches
```

The workflow should allow development users to create and edit import batch
metadata and add source references only. It should not create staging rows or
parse any source content.

## Prompt 98 Target

Minimum behavior:

- List recent `ImportBatch` records.
- Create `ImportBatch` metadata:
  - import domain
  - source system
  - optional batch key
  - notes
- Edit `ImportBatch` metadata while preserving the batch id.
- Add `ImportSource` metadata to a batch:
  - source name
  - source type
  - optional source hash
  - notes
- Link from `/internal/import-staging-readiness` to `/internal/import-batches`.
- Revalidate `/internal/import-staging-readiness`, `/internal/import-batches`,
  and `/api/health` after metadata writes.

## Validation Rules

- Require import domain.
- Require source system for batch creation.
- Reject duplicate `batchKey` with a readable error.
- Require source name and source type for source metadata.
- Ensure source metadata belongs to an existing batch.
- Do not create `ImportStagingRow`, `ImportValidationFinding`, or
  `ImportMappingDecision` records.

## Durable Plan

```text
docs/IMPORT_BATCH_METADATA_WORKFLOW_PLAN.md
```

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app and smoke-check `/`, `/operations-control`, `/aircraft`,
  `/api/health`, `/internal/import-staging-readiness`, `/flights`, `/crew`,
  and `/scheduling`.

## Assumptions

- No auth exists, so `createdById` and `reviewedById` stay null.
- Metadata-only writes are safe because they do not parse/import/apply data.
- Prompt 99 should QA the metadata workflow after Prompt 98.

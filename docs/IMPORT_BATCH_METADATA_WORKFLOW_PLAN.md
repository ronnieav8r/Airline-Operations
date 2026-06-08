# Import Batch Metadata Workflow Plan

Last updated: 2026-06-08

## Summary

This document defines the first metadata-only write workflow for the import
staging lane.

The workflow is intentionally narrow. It creates import batch and source
metadata only. It does not parse source files, upload files, create staging
rows, run dry-runs, review/apply imports, write operational records, add
auth/signatures, or perform destructive cleanup.

## Route

```text
/internal/import-batches
```

The route should stay internal and development-oriented.

## Allowed Writes

Allowed:

- Create `ImportBatch`.
- Edit `ImportBatch` metadata.
- Create `ImportSource` metadata attached to an existing batch.

Not allowed:

- Create `ImportStagingRow`.
- Create `ImportValidationFinding`.
- Create `ImportMappingDecision`.
- Parse source content.
- Upload files.
- Write aircraft, maintenance, airworthiness, FlightLeg, crew, manifest,
  dispatch, release, or other operational records.

## Import Batch Form

Fields:

- `importDomain`, required.
- `sourceSystem`, required.
- `batchKey`, optional.
- `notes`, optional.

Defaults:

- `status = DRAFT`.
- `createdById = null`.
- `reviewedById = null`.
- `reviewedAt = null`.
- `summary = null`.

Validation:

- Reject missing import domain.
- Reject missing source system.
- Reject duplicate batch key.
- Preserve existing batch id on edit.
- Do not expose status transitions yet.

## Import Source Metadata Form

Fields:

- `batchId`, required.
- `sourceName`, required.
- `sourceType`, required.
- `sourceHash`, optional.
- `notes`, optional.

Validation:

- Reject missing or invalid batch id.
- Reject missing source name.
- Reject missing source type.
- Do not read source file contents.
- Do not create staging rows.

## Diagnostic Linkage

`/internal/import-staging-readiness` should link to `/internal/import-batches`
so a developer can move from diagnostics to metadata setup.

After metadata writes, revalidate:

- `/internal/import-batches`
- `/internal/import-staging-readiness`
- `/api/health`

## Prompt 98 Target

Prompt 98 should implement the metadata workflow only.

Prompt 98 must not add:

- File uploads.
- Parser execution.
- Dry-run execution.
- Staging-row writes.
- Review/apply workflow.
- Operational writes.
- Auth/signatures.
- Source-specific mapping code.

Prompt 98 implementation status: complete. `/internal/import-batches` now
supports metadata-only `ImportBatch` create/edit and `ImportSource` creation.
It does not create staging rows, validation findings, mapping decisions, parser
execution, file uploads, dry-run execution, review/apply workflow, or
operational writes.

## Prompt 99 Target

Prompt 99 should validate:

- Creating a batch.
- Editing batch metadata.
- Adding source metadata.
- Diagnostic counts update.
- Staging rows/findings/mapping decisions remain zero unless already seeded by
  other tests.
- Main app routes still load.

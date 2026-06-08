# Import Staging Diagnostic Plan

Last updated: 2026-06-08

## Summary

This document plans a future hidden read-only diagnostic for import staging
state.

This is planning only. It does not implement parser code, importer execution,
file uploads, staging-row writes, operational writes, review/apply route
handlers, auth/signatures, destructive cleanup, provider integrations,
source-specific mapping code, or the diagnostic route itself.

## Proposed Route

```text
/internal/import-staging-readiness
```

Purpose: let builder/planner chats and future admins confirm whether the import
staging foundation is empty, populated, validated, or accumulating errors
without exposing any mutation controls.

## Read-Only Data

The diagnostic should read:

- `ImportBatch`
- `ImportSource`
- `ImportStagingRow`
- `ImportValidationFinding`
- `ImportMappingDecision`

It should not read or write operational target tables except for future
high-level linked counts if separately approved.

## Proposed Sections

### Summary Counts

Show total counts for:

- import batches.
- import sources.
- staging rows.
- validation findings.
- mapping decisions.

### Batch Coverage

Show:

- batch counts by `ImportDomain`.
- batch counts by `ImportBatchStatus`.
- recent batches with batch key, domain, status, source system, row count,
  finding count, decision count, created time, reviewed time, and notes
  presence.

### Row Validation Coverage

Show row counts by:

- `ImportValidationStatus`.
- source dataset/source name when available.
- mapped target type.

### Findings Coverage

Show finding counts by:

- `ImportFindingSeverity`.
- finding code.
- field name when available.

The diagnostic should make it easy to spot repeated source-format or mapping
problems before any import application is built.

### Mapping Decisions

Show mapping decision counts by:

- `ImportMappingDecisionStatus`.
- target type.
- decided/not decided.

### Empty State

When no staging data exists, show a clear message:

```text
Import staging schema is installed. No import batches have been staged yet.
```

This is expected during current development.

## Guardrails

- No buttons or forms.
- No server actions.
- No route handlers that create, update, delete, parse, import, or apply data.
- No file upload surface.
- No operational writes.
- No auth/signature assumptions.
- No hard release blocking or release evidence mutation.

## Prompt 95 Target If Approved

Prompt 95 could implement `/internal/import-staging-readiness` as a read-only
page using Prisma aggregate queries only.

Minimum behavior:

- Render successfully when all import staging tables are empty.
- Show counts from `/api/health`-equivalent staging tables.
- Show batch, row, finding, and mapping decision summaries when data exists.
- Keep all import behavior read-only.

Prompt 95 implementation status: complete. The route now exists and reads
staging aggregate data only. No parser/import execution, file upload,
staging-row write, operational write, review/apply route, auth/signature,
destructive cleanup, provider integration, or source-specific mapping code was
added.

Prompt 96 QA status: complete. Local QA confirmed the route renders, empty
state appears while staging tables are empty, health counts remain available,
and validation/build checks pass. Results are recorded in
`docs/LEGACY_IMPORT_QA_LOG.md`.

## Deferred

- Import batch creation UI.
- Source file upload.
- Parser execution.
- Staging-row creation.
- Dry-run execution.
- Review/approve/apply workflow.
- Operational writes.
- Source-specific mapping code.

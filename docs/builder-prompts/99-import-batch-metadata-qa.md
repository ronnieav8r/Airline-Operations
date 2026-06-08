# Prompt 99: Import Batch Metadata QA

## Summary

Validate the metadata-only import batch/source workflow added in Prompt 98.
This is a QA/docs-only slice unless a workflow defect is found.

Do not add parser code, importer execution, file uploads, staging-row writes,
dry-run execution, review/apply route handlers, auth/signatures, destructive
cleanup, provider integrations, source-specific mapping code, or operational
writes.

## QA Scope

- Confirm `/internal/import-batches` returns 200.
- Create a metadata-only import batch.
- Edit the batch metadata.
- Add source metadata.
- Confirm `/internal/import-staging-readiness` reflects the batch/source.
- Confirm `ImportStagingRow`, `ImportValidationFinding`, and
  `ImportMappingDecision` counts remain zero.
- Confirm main routes still load.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app and smoke-check `/internal/import-batches`.
- Browser-test create/edit/source metadata workflow.
- Smoke-check `/`, `/operations-control`, `/aircraft`, `/api/health`,
  `/internal/import-staging-readiness`, `/flights`, `/crew`, and `/scheduling`.

## Assumptions

- Metadata-only local QA may leave local development import batch/source rows.
- No production import behavior is added.

# Prompt 96: Import Staging Diagnostic QA

## Summary

Validate the read-only import staging diagnostic added in Prompt 95. This is a
QA/docs-only slice unless a diagnostic defect is found.

Do not add parser code, importer execution, file uploads, staging-row writes,
operational writes, review/apply route handlers, auth/signatures, destructive
cleanup, provider integrations, source-specific mapping code, or mutation
controls.

## QA Scope

- Confirm `/internal/import-staging-readiness` returns 200.
- Confirm the empty-state message renders while staging tables are empty.
- Confirm summary counts render.
- Confirm main app routes still load.
- Confirm `/api/health` still exposes import staging counts.
- Confirm validation checks pass.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app and smoke-check `/internal/import-staging-readiness`.
- Smoke-check `/`, `/operations-control`, `/aircraft`, `/api/health`,
  `/flights`, `/crew`, and `/scheduling`.
- Browser-check `/internal/import-staging-readiness`.

## Assumptions

- Import staging tables are empty by default.
- Prompt 97 should plan the next metadata-only workflow.

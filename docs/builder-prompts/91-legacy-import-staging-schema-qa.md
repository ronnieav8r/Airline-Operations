# Prompt 91: Legacy Import Staging Schema QA

## Summary

Validate the Prompt 90 additive import staging schema foundation and document
the results. This is a QA/docs-only slice unless a schema defect is found.

Do not add importer execution, parser code, file uploads, operational writes,
review/apply route handlers, auth/signatures, destructive cleanup, provider
integrations, or source-specific mapping behavior.

## QA Scope

- Confirm local migrations are applied.
- Confirm Prisma validates the additive staging schema.
- Confirm typecheck, lint, and production build pass.
- Confirm `/api/health` exposes import staging counts.
- Confirm import staging counts are zero on local demo data.
- Confirm main app routes still load.
- Confirm Operations Control still renders in the browser.

## Expected Health Keys

- `importBatches`
- `importSources`
- `importStagingRows`
- `importValidationFindings`
- `importMappingDecisions`

## Test Plan

- Run `npm run db:local:up`.
- Run `npm run db:local:migrate`.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app and smoke-check `/`, `/operations-control`, `/aircraft`,
  `/api/health`, `/flights`, `/crew`, and `/scheduling`.
- Browser-check `/operations-control`.

## Assumptions

- No import staging seed data exists yet.
- Zero counts are expected.
- Prompt 92 should plan aircraft maintenance import source format next.

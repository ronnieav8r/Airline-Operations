# Prompt 90: Legacy Import Staging Schema Foundation

## Summary

Implement the additive legacy import staging schema foundation. This slice adds
database tables, health counts, migration, and DBML updates only.

Do not add importer execution, parser code, file uploads, operational writes,
review/apply route handlers, auth/signatures, destructive cleanup, provider
integrations, or source-specific mapping behavior.

## Implemented Changes

- Added import staging enums:
  - `ImportDomain`
  - `ImportBatchStatus`
  - `ImportSourceType`
  - `ImportValidationStatus`
  - `ImportFindingSeverity`
  - `ImportMappingDecisionStatus`
- Added staging-only Prisma models:
  - `ImportBatch`
  - `ImportSource`
  - `ImportStagingRow`
  - `ImportValidationFinding`
  - `ImportMappingDecision`
- Added nullable future-user links:
  - `ImportBatch.createdById`
  - `ImportBatch.reviewedById`
  - `ImportMappingDecision.decidedById`
- Added `/api/health` counts for the new staging tables.
- Added additive migration:

```text
prisma/migrations/20260608101052_legacy_import_staging_schema_foundation
```

## Boundary

The new tables are staging records only. They do not link to operational target
tables through foreign keys. Target references remain copied text fields until
source formats, mapping policy, and import-apply workflow are separately
planned.

## Test Plan

- Run `npm run db:local:up`.
- Run local migration generation/application.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app and smoke-check `/`, `/operations-control`, `/aircraft`,
  `/api/health`, `/flights`, `/crew`, and `/scheduling`.
- Confirm `/api/health` exposes zero-count import staging table keys on local
  seed data.

## Assumptions

- No rows are seeded into import staging tables yet.
- Prompt 91 should QA the staging schema and health diagnostics.
- Prompt 92 should plan aircraft maintenance import source formats before any
  parser or importer code exists.

# Prompt 94: Import Staging Read-Only Diagnostic Planning

## Summary

Plan a hidden read-only diagnostic for the import staging foundation. This is a
planning/docs-only slice.

Do not add parser code, importer execution, file uploads, staging-row writes,
operational writes, review/apply route handlers, auth/signatures, destructive
cleanup, provider integrations, source-specific mapping code, or diagnostic
implementation.

## Decision

The next implementation slice may add a hidden read-only route:

```text
/internal/import-staging-readiness
```

The diagnostic should summarize import staging state without allowing any
mutation or import execution.

## Durable Plan

```text
docs/IMPORT_STAGING_DIAGNOSTIC_PLAN.md
```

## Planned Diagnostic Scope

- Staging table counts.
- Batch counts by domain and status.
- Recent import batches.
- Row validation-status counts.
- Finding counts by severity and code.
- Mapping decision counts by decision status.
- Empty-state guidance when no staging data exists.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app and smoke-check `/`, `/operations-control`, `/aircraft`,
  `/api/health`, `/flights`, `/crew`, and `/scheduling`.
- Browser-check `/operations-control`.

## Assumptions

- Staging tables exist from Prompt 90.
- Staging tables are empty by default.
- Prompt 94 does not implement the diagnostic route.
- Prompt 95 can implement the diagnostic route if approved.

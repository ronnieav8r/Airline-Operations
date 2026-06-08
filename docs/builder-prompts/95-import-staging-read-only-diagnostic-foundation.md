# Prompt 95: Import Staging Read-Only Diagnostic Foundation

## Summary

Implement the hidden read-only import staging diagnostic planned in Prompt 94.

Do not add parser code, importer execution, file uploads, staging-row writes,
operational writes, review/apply route handlers, auth/signatures, destructive
cleanup, provider integrations, source-specific mapping code, or mutation
controls.

## Implemented Changes

- Added read-only helper:

```text
lib/import-staging-diagnostics.ts
```

- Added hidden diagnostic route:

```text
/internal/import-staging-readiness
```

The route summarizes:

- Import staging table counts.
- Batch counts by domain and status.
- Row counts by validation status and mapped target type.
- Finding counts by severity and code.
- Mapping decision counts by decision status and target type.
- Recent batches and sources.
- Empty-state guidance when no import batches exist.

## Guardrails

- No forms.
- No buttons.
- No server actions.
- No parser/import execution.
- No staging mutations.
- No operational writes.
- No auth/signature assumptions.

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

- Staging tables are empty by default.
- Prompt 96 should QA this diagnostic and keep the slice QA/docs-only unless a
  defect is found.

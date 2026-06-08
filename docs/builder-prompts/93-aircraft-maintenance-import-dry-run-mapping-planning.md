# Prompt 93: Aircraft Maintenance Import Dry-Run Mapping Planning

## Summary

Plan dry-run mapping for aircraft maintenance and airworthiness import sources.
This is a planning/docs-only slice.

Do not add parser code, importer execution, file uploads, staging-row writes,
operational writes, review/apply route handlers, auth/signatures, destructive
cleanup, provider integrations, or source-specific mapping code.

## Decision

Future dry-runs should transform source rows into staging candidates, validation
findings, and mapping decisions without writing operational records.

The first dry-run should validate:

- Aircraft identity match.
- Required source identifiers.
- Status and enum mappings.
- Required dates.
- Discrepancy/deferral/release relationship consistency.
- Duplicate idempotency keys.
- Whether target mapping is accepted, warning-only, rejected, or duplicate.

## Durable Plan

```text
docs/AIRCRAFT_MAINTENANCE_IMPORT_DRY_RUN_MAPPING_PLAN.md
```

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app and smoke-check `/`, `/operations-control`, `/aircraft`,
  `/api/health`, `/flights`, `/crew`, and `/scheduling`.
- Browser-check `/aircraft`.

## Assumptions

- Prompt 93 does not implement dry-run execution.
- Prompt 94 should plan read-only import staging diagnostics.
- Ambiguous source-field mapping remains a stop condition.

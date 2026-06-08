# Prompt 92: Aircraft Maintenance Import Source Format Planning

## Summary

Plan the source format for the first legacy import domain: aircraft maintenance
and airworthiness history. This is a planning/docs-only slice.

Do not add parser code, importer execution, file uploads, staging-row writes,
operational writes, auth/signatures, destructive cleanup, provider
integrations, or source-specific mapping behavior.

## Decision

Use a small source packet made of separate CSV/XLSX/JSON-compatible datasets
instead of one overloaded file. The first planned packet should include:

- Aircraft identity references.
- Maintenance events.
- Discrepancies.
- Deferrals.
- Aircraft airworthiness releases.

The source format should prioritize stable identifiers and row-level source
references so future dry-runs can create useful staging diagnostics before any
operational records are written.

## Durable Plan

```text
docs/AIRCRAFT_MAINTENANCE_IMPORT_SOURCE_FORMAT_PLAN.md
```

## Required Planning Boundaries

- Aircraft matching should require a tail number or a separately approved
  aircraft identity mapping.
- Source rows should provide stable source IDs where possible.
- Unknown, vague, or conflicting source fields should stop future importer
  implementation until mapping is clarified.
- Legacy source files can be placed outside the app. File uploads remain
  deferred.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app and smoke-check `/`, `/operations-control`, `/aircraft`,
  `/api/health`, `/flights`, `/crew`, and `/scheduling`.
- Browser-check `/aircraft`.

## Assumptions

- Actual legacy source files are not available yet.
- This slice does not create staging rows.
- Prompt 93 should plan dry-run mapping from this source packet into staging
  candidates.

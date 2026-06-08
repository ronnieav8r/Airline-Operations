# Prompt 88: Next Slice Planning

## Summary

Choose the next safe AeroOps slice after the Prompt 82-87 batch. This is a
planning/docs-only slice.

## Decision

The next safe build path is additive legacy import staging schema planning,
followed by a schema-only foundation.

Rationale:

- Prompt 87 selected database-backed staging and dry-run records.
- The app still must not execute imports, parse files, upload files, or write
  operational records.
- Additive staging tables give future import workflows a safe place to store
  batches, source metadata, raw rows, validation findings, and mapping
  decisions.
- A schema-only staging foundation is useful without committing to source-file
  formats or target operational writes.

## Selected Prompt Chain

- Prompt 89: Legacy Import Staging Schema Planning.
- Prompt 90: Legacy Import Staging Schema Foundation.
- Prompt 91: Legacy Import Staging Schema QA.
- Prompt 92: Aircraft Maintenance Import Source Format Planning.
- Prompt 93: Aircraft Maintenance Dry-Run Mapping Planning.
- Prompt 94: Import Staging Read-Only Diagnostic Planning.

## Guardrails

- No importer execution.
- No file uploads.
- No operational writes.
- No auth/signatures.
- No destructive cleanup.
- No provider integrations.
- Stop before ambiguous source-field mapping.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app and smoke-check `/`, `/operations-control`, `/aircraft`,
  `/api/health`, and main routes.

## Assumptions

- Prompt 88 does not add schema or app behavior.
- Schema implementation waits for Prompt 90.

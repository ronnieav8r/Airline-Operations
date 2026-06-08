# Prompt 89: Legacy Import Staging Schema Planning

## Summary

Plan the additive legacy import staging schema before implementation. This is a
planning/docs-only slice. Do not add Prisma schema, migrations, importer
execution, file uploads, operational writes, auth/signatures, destructive
cleanup, or provider integrations.

## Decision

Prompt 90 should add database-backed import staging tables only. These tables
should store import batches, source metadata, raw staged rows, validation
findings, and mapping decisions. They must not write to operational aircraft,
maintenance, airworthiness, FlightLeg, crew, manifest, dispatch, or release
tables.

## Planned Enums

`ImportDomain`:

- `AIRCRAFT_MAINTENANCE_AIRWORTHINESS`
- `FLIGHTLEG_HISTORY`
- `CREW_COMPLIANCE`
- `MANIFEST_HISTORY`
- `DISPATCH_RELEASE_EVIDENCE`

`ImportBatchStatus`:

- `DRAFT`
- `STAGED`
- `VALIDATED`
- `REVIEW_READY`
- `APPROVED`
- `REJECTED`
- `APPLIED`
- `VOIDED`

`ImportSourceType`:

- `CSV`
- `XLSX`
- `JSON`
- `PDF_REFERENCE`
- `MANUAL_REFERENCE`
- `OTHER`

`ImportValidationStatus`:

- `PENDING`
- `ACCEPTED`
- `WARNING`
- `REJECTED`
- `DUPLICATE`

`ImportFindingSeverity`:

- `INFO`
- `WARN`
- `ERROR`

`ImportMappingDecisionStatus`:

- `PROPOSED`
- `ACCEPTED`
- `REJECTED`
- `SUPERSEDED`

## Planned Models

`ImportBatch`:

- `id`
- `importDomain`
- `status`, default `DRAFT`
- `sourceSystem`
- `batchKey`, nullable unique
- `summary`, JSON
- `notes`
- `createdById`, nullable `User`
- `reviewedById`, nullable `User`
- `reviewedAt`
- timestamps

`ImportSource`:

- `id`
- `batchId`
- `sourceName`
- `sourceType`
- `sourceHash`
- `notes`
- `createdAt`

`ImportStagingRow`:

- `id`
- `batchId`
- `sourceId`, nullable
- `sourceRowNumber`, nullable
- `sourceExternalId`, nullable
- `idempotencyKey`, unique
- `rawRow`, JSON
- `mappedTargetType`, nullable
- `mappedTargetKey`, nullable
- `validationStatus`, default `PENDING`
- `validationSummary`, JSON
- timestamps

`ImportValidationFinding`:

- `id`
- `stagingRowId`
- `severity`
- `code`
- `message`
- `fieldName`, nullable
- `details`, JSON
- `createdAt`

`ImportMappingDecision`:

- `id`
- `stagingRowId`
- `decision`, default `PROPOSED`
- `targetType`
- `targetId`, nullable
- `reason`, nullable
- `decidedById`, nullable `User`
- `decidedAt`, nullable
- `createdAt`

## Relationship Policy

- User links are nullable until auth exists.
- Use explicit Prisma relation names for user links.
- `ImportSource`, `ImportStagingRow`, `ImportValidationFinding`, and
  `ImportMappingDecision` cascade only within staging records.
- Do not add foreign keys from staging rows to operational target tables yet.
  Target references should remain copied text fields until mapping and apply
  policy is approved.

## Idempotency Policy

Use a batch-independent idempotency key:

```text
{importDomain}:{sourceSystem}:{sourceExternalId || sourceRowHash}
```

`idempotencyKey` should be unique so repeated staging/dry-run attempts can
detect duplicates before operational writes.

## Prompt 90 Target

Prompt 90 should implement only the additive staging schema, migration, health
counts, and DBML updates. It should not add importer execution, parser code,
file uploads, route handlers that mutate staging rows, operational writes, or
review/apply workflows.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app and smoke-check `/`, `/operations-control`, `/aircraft`,
  `/api/health`, `/flights`, `/crew`, and `/scheduling`.

## Assumptions

- The first future import domain remains aircraft maintenance and
  airworthiness history.
- Source formats are not committed yet.
- Prompt 89 does not add schema or app behavior.

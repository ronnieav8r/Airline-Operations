# Legacy Import Staging Schema Plan

Last updated: 2026-06-08

## Summary

This document defines the additive import staging schema planned for the legacy
record import lane. The purpose is to create a safe database holding area for
future dry-run validation before any operational write workflow exists.

## Boundary

The staging schema is not an importer. It should not parse files, upload files,
write operational records, or approve imports. It only gives future import
workflows durable records for batches, sources, raw rows, validation findings,
and mapping decisions.

## Planned Tables

### ImportBatch

Batch-level container for a future import attempt.

Fields:

- `id`
- `importDomain`
- `status`
- `sourceSystem`
- `batchKey`
- `summary`
- `notes`
- `createdById`
- `reviewedById`
- `reviewedAt`
- `createdAt`
- `updatedAt`

### ImportSource

Source metadata for files or manually referenced source material.

Fields:

- `id`
- `batchId`
- `sourceName`
- `sourceType`
- `sourceHash`
- `notes`
- `createdAt`

### ImportStagingRow

One raw source row staged for validation and mapping.

Fields:

- `id`
- `batchId`
- `sourceId`
- `sourceRowNumber`
- `sourceExternalId`
- `idempotencyKey`
- `rawRow`
- `mappedTargetType`
- `mappedTargetKey`
- `validationStatus`
- `validationSummary`
- `createdAt`
- `updatedAt`

### ImportValidationFinding

One validation result attached to a staged row.

Fields:

- `id`
- `stagingRowId`
- `severity`
- `code`
- `message`
- `fieldName`
- `details`
- `createdAt`

### ImportMappingDecision

One proposed or reviewed mapping decision for a staged row.

Fields:

- `id`
- `stagingRowId`
- `decision`
- `targetType`
- `targetId`
- `reason`
- `decidedById`
- `decidedAt`
- `createdAt`

## Planned Enums

- `ImportDomain`
- `ImportBatchStatus`
- `ImportSourceType`
- `ImportValidationStatus`
- `ImportFindingSeverity`
- `ImportMappingDecisionStatus`

## Target Reference Policy

Staging rows and mapping decisions should use copied text fields for target
type/key references at first. Do not add operational foreign keys until the
source format, mapping rules, and apply workflow are approved.

This keeps staging records durable even when a future mapping candidate is
invalid, missing, ambiguous, or not yet created in AeroOps.

## User And Review Policy

User references are nullable planning hooks only:

- `ImportBatch.createdById`
- `ImportBatch.reviewedById`
- `ImportMappingDecision.decidedById`

No auth, signatures, or role checks exist yet.

## Prompt 90 Implementation Scope

Prompt 90 should:

- Add the enums and models additively in Prisma.
- Add one additive migration.
- Add health counts for the new tables.
- Update current/planning DBML docs.
- Keep seed/import execution empty unless only zero-row table creation is
  needed by migration.

Prompt 90 must not:

- Create importer execution code.
- Add file upload or storage.
- Add parser code.
- Add operational target writes.
- Add review/apply workflow routes.
- Add auth/signature behavior.
- Add destructive cleanup.

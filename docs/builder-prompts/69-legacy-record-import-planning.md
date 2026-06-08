# Prompt 69: Legacy Record Import Planning

## Summary

Plan a future import method for old records without building import execution
yet.

The chosen approach is **staging plus dry-run first**. Imports should not write
directly into operational tables until source formats, idempotency keys,
validation rules, and review behavior are defined.

## Key Decisions

- Do not implement import execution in this prompt.
- Do not add file uploads yet.
- Do not choose a single legacy source format yet.
- Start import planning with maintenance/airworthiness history because it is
  valuable and less entangled than flight release records.
- Use staging records and dry-run summaries before operational writes.
- Every imported row should retain source filename, source row/reference, import
  batch, and reviewer status.
- Every operational write should have an idempotency key to prevent duplicates.

## Future Import Flow

Recommended import workflow:

1. Upload or place source file.
2. Parse into staging rows.
3. Show dry-run counts, warnings, and rejected rows.
4. Let a reviewer approve an import batch.
5. Write operational records with source references and idempotency keys.
6. Store import summary and rejected-row details.

## Initial Target Domain

First import domain should be aircraft maintenance history:

- Aircraft identity mapping.
- Maintenance event date/type/description.
- Discrepancy references when available.
- Deferral references when available.
- Airworthiness-release references when available.
- Source document references.

## Deferred Domains

- Flight history imports.
- Crew qualification imports.
- Passenger/manifest imports.
- Release package imports.
- Duty/rest imports.
- SMS/safety report imports.

## Future Schema Concepts

Likely future tables:

- `ImportBatch`
- `ImportSourceFile`
- `ImportStagingRow`
- `ImportMappingRule`
- `ImportReviewDecision`
- Source reference fields on imported operational records

These should be planned in detail before implementation.

## Assumptions

- There is no important production data yet, but import design should still be
  conservative because old records may become compliance evidence.
- CSV/XLSX is likely the first supported source family, but the final source
  format should be based on the actual old records.

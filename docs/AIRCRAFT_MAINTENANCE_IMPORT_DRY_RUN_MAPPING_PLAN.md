# Aircraft Maintenance Import Dry-Run Mapping Plan

Last updated: 2026-06-08

## Summary

This document plans how future aircraft maintenance and airworthiness import
dry-runs should map source rows into staging candidates and validation findings.

This is planning only. It does not implement parser code, importer execution,
file uploads, staging-row writes, operational writes, review/apply routes,
auth/signatures, destructive cleanup, provider integrations, or
source-specific mapping code.

## Dry-Run Goal

A dry-run should answer one question:

```text
If this source packet were imported later, which rows would map cleanly,
which rows need review, which rows are duplicates, and which rows must be
rejected before operational writes are allowed?
```

## Future Dry-Run Flow

1. Read source rows from the planned source packet.
2. Normalize row values in memory.
3. Build an `idempotencyKey` for each row.
4. Stage raw rows in `ImportStagingRow`.
5. Match aircraft by `tailNumber` or approved identity mapping.
6. Classify each row's intended target type.
7. Add `ImportValidationFinding` rows for errors, warnings, and info.
8. Add `ImportMappingDecision` rows for proposed target mappings.
9. Summarize counts on `ImportBatch.summary`.
10. Stop before operational writes.

Prompt 93 does not implement these steps.

## Target Types

Use copied target type labels in staging records:

- `Aircraft`
- `MaintenanceEvent`
- `Discrepancy`
- `Deferral`
- `AirworthinessRelease`

Do not add operational foreign keys to staging rows yet.

## Aircraft Matching

Primary match:

- `tailNumber` to `Aircraft.tailNumber`

Future reviewed fallback:

- approved mapping from `legacyAircraftId` or serial number to `Aircraft.id`

Validation findings:

- `AIRCRAFT_MISSING_TAIL`: source row has no usable tail number.
- `AIRCRAFT_NOT_FOUND`: no matching aircraft exists.
- `AIRCRAFT_AMBIGUOUS`: more than one possible aircraft mapping exists.
- `AIRCRAFT_IDENTITY_REVIEW_REQUIRED`: row relies on a non-tail-number match.

Rows with `AIRCRAFT_MISSING_TAIL`, `AIRCRAFT_NOT_FOUND`, or
`AIRCRAFT_AMBIGUOUS` should be `REJECTED` until reviewed.

## Maintenance Event Mapping

Candidate target: `MaintenanceEvent`.

Future `mappedTargetKey`:

```text
MaintenanceEvent:{tailNumber}:{eventNumber || workOrderNumber}
```

Validation findings:

- `MAINT_EVENT_MISSING_ID`: no event number or work order number.
- `MAINT_EVENT_MISSING_DATE`: no event date or completed date.
- `MAINT_EVENT_TYPE_UNKNOWN`: event type cannot map to current enum.
- `MAINT_EVENT_STATUS_UNKNOWN`: status cannot map to current enum.
- `MAINT_EVENT_DUPLICATE`: idempotency key or target key already exists.
- `MAINT_EVENT_LINKED_DISC_NOT_FOUND`: linked discrepancy cannot be matched.

Recommended validation status:

- `ACCEPTED` when aircraft, identity, date, type, and status map cleanly.
- `WARNING` when linked discrepancy is missing but the event itself is usable.
- `REJECTED` when aircraft, identity, date, type, or status is missing or
  unknown.
- `DUPLICATE` when idempotency or target key already exists.

## Discrepancy Mapping

Candidate target: `Discrepancy`.

Future `mappedTargetKey`:

```text
Discrepancy:{tailNumber}:{discrepancyNumber}
```

Validation findings:

- `DISC_MISSING_ID`: no discrepancy number.
- `DISC_MISSING_SUMMARY`: no title or description.
- `DISC_STATUS_UNKNOWN`: status cannot map to current enum.
- `DISC_DUPLICATE`: idempotency key or target key already exists.
- `DISC_EVENT_SPLIT_REQUIRED`: row combines discrepancy and maintenance event
  data that cannot be separated safely.

Recommended validation status:

- `ACCEPTED` when aircraft, discrepancy number, summary, and status map cleanly.
- `WARNING` when severity/reporter/source reference is incomplete but the core
  discrepancy can map.
- `REJECTED` when aircraft, discrepancy number, summary, or status is missing
  or unknown.
- `DUPLICATE` when idempotency or target key already exists.

## Deferral Mapping

Candidate target: `Deferral`.

Future `mappedTargetKey`:

```text
Deferral:{tailNumber}:{deferralNumber}
```

Validation findings:

- `DEFERRAL_MISSING_ID`: no deferral number.
- `DEFERRAL_DISC_NOT_FOUND`: linked discrepancy cannot be matched.
- `DEFERRAL_STATUS_UNKNOWN`: status cannot map to current enum.
- `DEFERRAL_CATEGORY_REVIEW_REQUIRED`: category requires MEL/CDL or policy
  interpretation.
- `DEFERRAL_DUPLICATE`: idempotency key or target key already exists.

Recommended validation status:

- `ACCEPTED` when aircraft, deferral number, linked discrepancy, and status map
  cleanly.
- `WARNING` when category or due-date context needs review but the row can be
  staged.
- `REJECTED` when aircraft, deferral number, linked discrepancy, or status is
  missing or unknown.
- `DUPLICATE` when idempotency or target key already exists.

## Airworthiness Release Mapping

Candidate target: `AirworthinessRelease`.

Future `mappedTargetKey`:

```text
AirworthinessRelease:{tailNumber}:{releaseNumber}
```

Validation findings:

- `AW_RELEASE_MISSING_ID`: no release number.
- `AW_RELEASE_STATUS_UNKNOWN`: status cannot map to current enum.
- `AW_RELEASE_MISSING_RELEASED_AT`: status is released but release date is
  missing.
- `AW_RELEASE_OPERATIONAL_RELEASE_CONFUSION`: row appears to be a FlightLeg
  operational release instead of aircraft airworthiness release.
- `AW_RELEASE_DUPLICATE`: idempotency key or target key already exists.

Recommended validation status:

- `ACCEPTED` when aircraft, release number, status, and required release date
  map cleanly.
- `WARNING` when maintenance-event link or released-by name cannot be resolved.
- `REJECTED` when aircraft, release number, status, or released date policy is
  missing or ambiguous.
- `DUPLICATE` when idempotency or target key already exists.

## Batch Summary Shape

Future dry-run summary should include:

- total rows by source dataset.
- accepted rows.
- warning rows.
- rejected rows.
- duplicate rows.
- unmapped aircraft rows.
- unknown enum/status rows.
- target counts by type.
- rows requiring source-field clarification.

## Stop Conditions

Stop before importer implementation if:

- Aircraft identity cannot be matched safely.
- Source rows combine multiple operational concepts without stable IDs.
- Status or type fields require legal/policy interpretation.
- MEL/CDL category interpretation is required.
- A row appears to be an operational FlightLeg release instead of aircraft
  airworthiness release.
- Duplicate detection cannot be made idempotent.

## Prompt 94 Status

Prompt 94 planned a future read-only import staging diagnostic route. The
durable diagnostic plan is:

```text
docs/IMPORT_STAGING_DIAGNOSTIC_PLAN.md
```

No diagnostic route or import execution was implemented.

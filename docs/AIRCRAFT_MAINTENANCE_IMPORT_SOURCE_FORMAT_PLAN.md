# Aircraft Maintenance Import Source Format Plan

Last updated: 2026-06-08

## Summary

This document defines the planned source packet for the first legacy import
domain: aircraft maintenance and airworthiness history.

This is a format plan only. It does not implement parser code, importer
execution, file uploads, staging-row writes, operational writes, review/apply
workflow, auth/signatures, destructive cleanup, provider integrations, or
source-specific mapping.

## Preferred Source Packet

Use separate source datasets instead of one overloaded file:

- `aircraft_identity`
- `maintenance_events`
- `discrepancies`
- `deferrals`
- `airworthiness_releases`

CSV, XLSX, JSON, and manually referenced sources can all map into this packet
shape. The future importer should stage raw rows first and validate/match them
before any operational write is possible.

## Shared Source Columns

Every source row should include as many of these columns as available:

- `sourceSystem`: legacy system or export name.
- `sourceFileName`: file or document reference.
- `sourceRowNumber`: row number when applicable.
- `sourceExternalId`: stable legacy row ID when available.
- `sourceDocumentRef`: logbook, work order, release, or document reference.
- `sourceNotes`: context that should not be mapped directly.

Future idempotency should prefer:

```text
{importDomain}:{sourceSystem}:{sourceExternalId || sourceRowHash}
```

## Aircraft Identity Dataset

Purpose: provide aircraft matching context before maintenance rows are mapped.

Recommended columns:

- `tailNumber`
- `serialNumber`
- `aircraftName`
- `aircraftType`
- `homeStationCode`
- `legacyAircraftId`
- `activeFlag`

Minimum useful row:

- `tailNumber`

Policy:

- `tailNumber` is the preferred match key.
- If tail number is missing or has changed, a separate reviewed aircraft
  identity mapping is required before import implementation.

## Maintenance Events Dataset

Target candidate: `MaintenanceEvent`.

Recommended columns:

- `tailNumber`
- `eventNumber`
- `workOrderNumber`
- `eventDate`
- `completedAt`
- `eventType`
- `status`
- `description`
- `correctiveAction`
- `discrepancyNumber`
- `approvedByName`
- `sourceDocumentRef`

Minimum useful row:

- `tailNumber`
- `eventNumber` or `workOrderNumber`
- `eventDate` or `completedAt`
- `eventType`

Ambiguity stop conditions:

- Missing aircraft identity.
- Missing event identity.
- Event type cannot be mapped to current `MaintenanceEventType`.
- Status cannot be mapped to current `MaintenanceEventStatus`.

## Discrepancies Dataset

Target candidate: `Discrepancy`.

Recommended columns:

- `tailNumber`
- `discrepancyNumber`
- `reportedAt`
- `title`
- `description`
- `severity`
- `status`
- `correctiveSummary`
- `clearedAt`
- `reportedByName`
- `sourceDocumentRef`

Minimum useful row:

- `tailNumber`
- `discrepancyNumber`
- `title` or `description`
- `reportedAt` when available

Ambiguity stop conditions:

- Missing aircraft identity.
- Missing discrepancy identity.
- Status cannot be mapped to `OPEN`, `DEFERRED`, `CLEARED`, or `CANCELLED`.
- A row appears to describe both a discrepancy and a corrective maintenance
  event without a stable event/discrepancy split.

## Deferrals Dataset

Target candidate: `Deferral`.

Recommended columns:

- `tailNumber`
- `deferralNumber`
- `discrepancyNumber`
- `category`
- `deferredAt`
- `dueAt`
- `clearedAt`
- `status`
- `notes`
- `authorizedByName`
- `sourceDocumentRef`

Minimum useful row:

- `tailNumber`
- `deferralNumber`
- `discrepancyNumber`
- `category` when available

Ambiguity stop conditions:

- Missing aircraft identity.
- Missing linked discrepancy identity.
- Status cannot be mapped to `ACTIVE`, `CLEARED`, `EXPIRED`, or `CANCELLED`.
- Deferral category requires MEL/CDL interpretation beyond simple demo
  tracking.

## Airworthiness Releases Dataset

Target candidate: `AirworthinessRelease`.

Recommended columns:

- `tailNumber`
- `releaseNumber`
- `status`
- `releasedAt`
- `expiresAt`
- `releaseNotes`
- `releasedByName`
- `maintenanceEventNumber`
- `sourceDocumentRef`

Minimum useful row:

- `tailNumber`
- `releaseNumber`
- `status`
- `releasedAt` when status is released

Ambiguity stop conditions:

- Missing aircraft identity.
- Missing release identity.
- Status cannot be mapped to `DRAFT`, `RELEASED`, `VOIDED`, or `SUPERSEDED`.
- Release appears to be a FlightLeg operational release rather than an
  aircraft maintenance airworthiness release.

## Deferred

- Actual parser implementation.
- File upload and storage.
- Staging-row creation.
- Dry-run mapping execution.
- Operational writes.
- Auth/signature attribution.
- Legal MEL/CDL interpretation.
- Provider integrations.

## Prompt 93 Status

Prompt 93 planned dry-run mapping for this source packet. The durable mapping
plan is:

```text
docs/AIRCRAFT_MAINTENANCE_IMPORT_DRY_RUN_MAPPING_PLAN.md
```

No dry-run execution or staging-row creation was implemented.

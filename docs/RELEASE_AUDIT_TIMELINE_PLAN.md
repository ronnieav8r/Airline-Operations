# Release Audit Timeline Plan

Last updated: 2026-06-07

## Purpose

Release actions now create audit events and linked release-attempt readiness
snapshots. The first audit UI should make those records visible on the
FlightLeg detail page without changing release behavior.

## Chosen First Timeline

Use a FlightLeg-local timeline:

- Source: `ReleaseAuditEvent` rows for the current FlightLeg.
- Order: newest first.
- Limit: latest 10 events.
- Location: below Preview Snapshots and above Release Control.

## Display Fields

Show each event with:

- Event type.
- Message.
- Created time.
- Actor placeholder.
- Snapshot link when available.
- Attempt metadata summary when available.
- Snapshot skip reason when available.

Actor placeholder:

```text
System / unauthenticated
```

This stays until auth exists.

## Snapshot Link Policy

If `snapshotId` exists, link to:

```text
/operations-control/[flightLegId]/snapshots/[snapshotId]
```

If no snapshot exists and metadata includes `snapshotSkippedReason`, show the
skip reason as informational text.

## Metadata Summary

For release-attempt audit events, display useful metadata when present:

- Attempted action.
- Attempted release status.
- Captured-before status.
- Whether a snapshot was captured.
- Snapshot skipped reason.

## Deferred

- Global audit console.
- Search, filter, export, or pagination.
- User attribution until auth exists.
- Legal signatures.
- Override approval workflow.
- Hard release blocking.
- Schema changes.

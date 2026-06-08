# Flight Locating Position History Plan

## Purpose

Flight locating needs more than a one-line `lastKnownPosition` summary. The app
should be able to show when position information was reported, where it came
from, and how current it is.

The first implementation should be manual and append-only. External tracking,
ADS-B, and automated overdue checks are deferred.

## Current State

- `FlightLocatingRecord` is one-to-one with `FlightLeg`.
- The current locating workflow can save responsible party, planned route, last
  known position, notes, and status.
- Status transitions support `FILED`, `ACTIVE`, and `CLOSED`.
- `OVERDUE` exists as a status but has no automation yet.
- `PositionReport` exists only in planning DBML, not current Prisma.

## Chosen First Workflow

Use `PositionReport` as a child history table under `FlightLocatingRecord`.

The locating page should support:

- Add manual position report.
- Show recent position reports.
- Keep the parent record's `lastKnownPosition` synchronized to the newest
  report summary.
- Keep release readiness warning-only.

## Minimum Position Report Fields

- `flightLocatingRecordId`
- `reportedAt`
- `positionSummary`
- `latitude`
- `longitude`
- `altitude`
- `groundspeed`
- `heading`
- `source`
- `notes`
- `createdAt`

Use `source = MANUAL` for the first workflow.

## Freshness Policy

Prompt 70 should store position history but should not enforce freshness.

Prompt 72 should update the Release Evidence Action Panel to summarize locating
freshness. The first freshness policy should be warning-only:

- Missing locating record: missing.
- No position reports on an active locating record: needs attention.
- Latest report exists: show latest report age and position summary.
- Closed locating record: complete enough for warning-only display.

Do not hard-block release actions.

## Deferred

- ADS-B/provider integrations.
- Automatic polling.
- Automatic overdue status.
- Notifications.
- Provider confidence scoring.
- Position report edit/delete/void.
- Auth/signature attribution.

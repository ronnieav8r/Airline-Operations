# Prompt 70: Manual Flight Locating Position History Foundation

## Summary

Implement manual position history for the existing Flight Locating workflow.

This is an additive schema and workflow slice. Keep release behavior
warning-only. Do not add ADS-B/provider integrations, automatic tracking,
automatic overdue rules, hard release blocking, auth/signatures, file uploads,
or release-action changes.

## Key Changes

- Add additive Prisma model `PositionReport`.
- Link `PositionReport` to `FlightLocatingRecord`.
- Add `/api/health` count visibility for position reports.
- Add a manual position report form to
  `/operations-control/[flightLegId]/locating`.
- Show recent position reports on the locating page.
- Keep `FlightLocatingRecord.lastKnownPosition` synchronized to the newest
  report by reported time.

## Manual Report Fields

- Required: reported time and position summary.
- Optional: latitude, longitude, altitude, groundspeed, heading, source, and
  notes.
- Default source: `MANUAL`.

## Deferred

- ADS-B/provider ingestion.
- Automatic overdue status.
- Report edit/delete/void workflow.
- Position confidence scoring.
- Raw provider payload storage.
- Auth/signatures.
- Hard release blocking.

## Test Plan

- Run `npm run db:local:up`.
- Run migration locally.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Add a manual position report on `/operations-control/[flightLegId]/locating`.
- Confirm the report appears in recent history.
- Confirm the parent locating summary reflects the newest report.
- Confirm `/api/health` includes `positionReports`.
- Confirm `/operations-control/[flightLegId]`, `/operations-control`, and main
  routes still load.

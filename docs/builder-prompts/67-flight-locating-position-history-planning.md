# Prompt 67: Flight Locating Position History Planning

## Summary

Plan the first position-history workflow for flight locating before
implementation.

The chosen policy is **manual position history first**. Keep the existing
`FlightLocatingRecord` as the one-row locating summary for a FlightLeg, then
add append-only manual position reports below it. Do not add ADS-B, provider
integrations, automatic tracking, hard release blocking, auth/signatures, file
uploads, or release-action changes.

## Key Decisions

- `FlightLocatingRecord` remains one-to-one with `FlightLeg`.
- Additive `PositionReport` rows should belong to `FlightLocatingRecord`.
- The latest manual position report should update
  `FlightLocatingRecord.lastKnownPosition` as the current summary.
- Position reports are append-only for the first workflow.
- No edit/delete/void workflow is included in the first implementation.
- Position reports may be entered for `FILED`, `ACTIVE`, `OVERDUE`, or `CLOSED`
  locating records, but the expected normal use is `ACTIVE`.
- If no locating record exists, adding a position report should create one.
- Release readiness remains warning-only.

## Prompt 70 Target

Prompt 70 should implement manual position history under
`/operations-control/[flightLegId]/locating`.

Minimum behavior:

- Add additive Prisma model `PositionReport`.
- Add local migration named `position-report-foundation`.
- Add a manual position report form to the locating page.
- Required fields: reported time and position summary.
- Optional fields: latitude, longitude, altitude, groundspeed, heading, source,
  and notes.
- Store `source = MANUAL` by default for manual entries.
- Create the parent `FlightLocatingRecord` if missing.
- Update `FlightLocatingRecord.lastKnownPosition` from the newest report.
- Show recent position reports on the locating page.
- Do not mutate `FlightRelease`.

## Deferred

- ADS-B or flight-tracking provider ingestion.
- Automatic overdue calculations.
- Editing, voiding, or deleting position reports.
- Position confidence scoring.
- Raw provider payload storage.
- Auth, signatures, or legal attestations.
- Hard release blocking.

## Test Plan For Prompt 70

- Run `npm run db:local:up`.
- Run `npx prisma migrate dev --name position-report-foundation`.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Add a manual position report on `/operations-control/[flightLegId]/locating`.
- Confirm the report appears in recent position history.
- Confirm `FlightLocatingRecord.lastKnownPosition` reflects the newest report.
- Confirm FlightLeg detail and Release Evidence Action Panel still render.
- Confirm `/api/health` includes nonzero position report counts after local QA.

## Assumptions

- This is a development workflow and warning-only.
- Manual position history is useful before provider integrations exist.
- ADS-B will later be added through a provider-neutral ingestion layer.

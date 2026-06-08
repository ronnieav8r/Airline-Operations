# Prompt 71: Manual Flight Locating Position History QA

## Summary

Validate the manual Flight Locating position history workflow added in Prompt
70.

This is a QA/docs slice unless a defect is found. Keep release behavior
warning-only. Do not add ADS-B/provider integrations, automatic tracking,
automatic overdue rules, hard release blocking, auth/signatures, file uploads,
report edit/delete/void workflow, or release-action changes.

## QA Scope

- Verify local migration state includes `PositionReport`.
- Verify a manual position report can be created from the locating workflow.
- Verify a parent `FlightLocatingRecord` is created if missing.
- Verify the newest report by reported time updates
  `FlightLocatingRecord.lastKnownPosition`.
- Verify an older report does not overwrite a newer summary.
- Verify recent reports render on `/operations-control/[flightLegId]/locating`.
- Verify `/api/health` includes `positionReports`.
- Verify FlightLeg detail and Release Evidence Action Panel still render.
- Verify main routes still load.

## Test Plan

- Run `npm run db:local:up`.
- Run `npm run db:local:migrate`.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Local workflow smoke:
  - Add a newer manual position report.
  - Add an older manual position report.
  - Confirm both reports exist.
  - Confirm the newest report remains the locating summary.
- Route smoke:
  - `/operations-control/[flightLegId]/locating`.
  - `/operations-control/[flightLegId]`.
  - `/api/health`.
  - Main routes.

## Assumptions

- Local QA data may include Prompt 70 smoke records.
- Direct server-action tests outside a browser request may throw expected
  redirect/revalidation exceptions after mutations.
- Database state is the source of truth for workflow QA.

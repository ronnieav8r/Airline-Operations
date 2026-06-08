# Prompt 73: Locating Freshness QA

## Summary

Validate the Release Evidence Action Panel locating freshness update added in
Prompt 72.

This is a QA/docs slice unless a defect is found. Keep release behavior
warning-only. Do not add automatic overdue rules, hard release blocking,
ADS-B/provider integrations, auth/signatures, file uploads, report
edit/delete/void workflow, or release-action changes.

## QA Scope

- Verify the locating card shows latest position report summary when a report
  exists.
- Verify the locating card shows a freshness/age label when a report exists.
- Verify the locating card links to the existing locating workflow.
- Verify `ACTIVE` locating with no position report shows `Needs attention` in
  the panel only.
- Verify release readiness and release actions still render.
- Verify main routes still load.

## Test Plan

- Run `npm run db:local:up`.
- Run `npm run db:local:migrate`.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Prepare local QA fixtures:
  - One FlightLeg with latest position reports.
  - One ACTIVE FlightLeg locating record with no position reports.
- Route/browser smoke:
  - `/operations-control/[flightLegId]` with latest report.
  - `/operations-control/[flightLegId]` with no report.
  - `/operations-control/[flightLegId]/locating`.
  - `/api/health`.

## Assumptions

- Local QA may mutate only the local Docker database.
- Freshness is informational only.
- Prompt 73 should update QA/status docs and commit even if no code changes are
  needed.

# Prompt 85: Release Audit Timeline QA

## Summary

Validate the Prompt 84 release audit timeline. Keep this slice QA/docs only
unless a defect is found.

## QA Scope

- Confirm FlightLeg detail renders the Release Audit Timeline when audit events
  exist.
- Confirm event type, message, created time, actor placeholder, snapshot link,
  and attempt metadata display.
- Confirm linked snapshot detail route loads.
- Confirm FlightLeg detail renders when no audit events exist.
- Confirm release actions remain warning-only and unchanged.
- Confirm main routes and diagnostics still load.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Use local audit events from Prompt 80/81.
- Start local app.
- Visit `/operations-control/[flightLegId]`.
- Browser-check visible `Release Audit Timeline`, release event type, snapshot
  link, actor placeholder, and Release Control.
- Visit a linked snapshot detail route.
- Check `/api/health`, `/internal/release-snapshot-readiness`,
  `/operations-control`, `/flights`, `/aircraft`, `/crew`, and `/scheduling`.

## Assumptions

- Prompt 85 does not add schema or app behavior.
- Release timeline remains read-only.
- Release behavior remains warning-only.

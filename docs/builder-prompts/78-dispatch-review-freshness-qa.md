# Prompt 78: Dispatch Review Freshness QA

## Summary

Validate the Prompt 77 Release Evidence Action Panel dispatch review/freshness
display. Keep this slice QA/docs only unless a defect is found.

## QA Scope

- Confirm FlightLeg detail renders the Release Evidence Action Panel.
- Confirm the dispatch card shows dispatch package review state.
- Confirm a `VOIDED` dispatch package surfaces as needing attention.
- Confirm the relevant review/freshness timestamp appears in the dispatch card
  message.
- Confirm the dispatch workflow page still renders.
- Confirm release readiness and release actions remain warning-only and
  unchanged.
- Confirm main routes and health still load.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start the local app.
- Visit `/operations-control/[flightLegId]`.
- Browser-check the Release Evidence Action Panel dispatch card.
- Visit `/operations-control/[flightLegId]/dispatch`.
- Route-check `/`, `/operations-control`, `/flights`, `/aircraft`, `/crew`,
  `/scheduling`, and `/api/health`.

## Assumptions

- Prompt 78 does not add schema or app behavior.
- Dispatch review remains informational.
- Release actions remain warning-only and unchanged.

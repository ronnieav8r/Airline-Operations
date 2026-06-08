# Prompt 112: Aircraft Context Detail QA

## Summary

Validate the Prompt 111 aircraft context detail foundation.

Prompt 112 is QA/docs only unless a defect is found. It should confirm
`/aircraft` remains a fleet board, `/aircraft/[aircraftId]` renders read-only
aircraft context, `/aircraft/[aircraftId]/airworthiness` still works, and
Operations Control workflow links route correctly.

## QA Scope

- Confirm `/aircraft` still renders the fleet board.
- Confirm `/aircraft` links to aircraft detail pages.
- Confirm `/aircraft/[aircraftId]` renders:
  - Overview.
  - Current Assignment.
  - Upcoming Legs.
  - Airworthiness.
  - Crew Coverage.
  - Alerts.
  - Operations Links.
- Confirm readable empty states appear where context is missing.
- Confirm `/aircraft/[aircraftId]/airworthiness` still works.
- Confirm Operations Control links from aircraft detail route correctly.
- Confirm no workflow behavior changed and no new mutations were added.

## Validation

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.

## Runtime Smoke

- Smoke-check `/aircraft`.
- Smoke-check one `/aircraft/[aircraftId]`.
- Smoke-check `/aircraft/[aircraftId]/airworthiness`.
- Smoke-check `/operations-control`.
- Smoke-check one `/operations-control/[flightLegId]`.
- Smoke-check `/`.
- Smoke-check `/flights`.
- Smoke-check `/crew`.
- Smoke-check `/scheduling`.
- Smoke-check `/api/health`.
- Smoke-check `/internal/flightleg-parity`.
- Smoke-check `/internal/flightleg-write-readiness`.

## Notes

- Prompt 112 does not add app behavior.
- Prompt 111 already implemented the read-only aircraft context route.
- Existing airworthiness writes remain under
  `/aircraft/[aircraftId]/airworthiness`.
- Release behavior remains warning-only.
- Legacy import work remains deferred.

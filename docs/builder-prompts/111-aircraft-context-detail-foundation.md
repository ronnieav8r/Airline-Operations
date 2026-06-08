# Prompt 111: Aircraft Context Detail Foundation

## Summary

Implement the Prompt 110 Fleet + Detail aircraft context plan.

Add `/aircraft/[aircraftId]` as a read-only aircraft operational context page,
keep `/aircraft` as the fleet board, and preserve
`/aircraft/[aircraftId]/airworthiness` for existing airworthiness writes.

## Key Changes

- Add a focused aircraft context query helper.
- Add the aircraft detail route at `/aircraft/[aircraftId]`.
- Add Aircraft Context links from `/aircraft` cards.
- Show aircraft identity, current/next assignment, upcoming legs, crew
  coverage, airworthiness state, discrepancies, deferrals, alerts, and
  Operations Control workflow links.
- Keep the route read-only with no forms, server actions, schema changes, auth,
  hard release blocking, imports, provider integrations, file uploads, AI
  behavior, or new release policy.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/aircraft`.
- Smoke-check one `/aircraft/[aircraftId]`.
- Smoke-check `/aircraft/[aircraftId]/airworthiness`.
- Smoke-check `/operations-control`.
- Smoke-check one `/operations-control/[flightLegId]`.
- Smoke-check `/`, `/flights`, `/crew`, `/scheduling`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`.
- Browser-check `/aircraft` and one aircraft detail page for context sections,
  empty states, airworthiness link, and Operations Control workflow links.

## Assumptions

- `/aircraft` remains the fleet board.
- `/aircraft/[aircraftId]` is read-only aircraft context.
- `/aircraft/[aircraftId]/airworthiness` remains the aircraft-level
  airworthiness write surface.
- Legacy import work remains deferred.

# Prompt 105: Operations Control Workbench Foundation

## Summary

Implement the Prompt 104 Operations Control workbench foundation on
`/operations-control`.

This is a UI/read-only slice. Add a filterable grouped board above the existing
table and preserve all current table behavior, links, and warning-only release
behavior.

## Key Changes

- Accept URL query params for `groupBy`, `release`, `evidence`, `part`, and
  `aircraft`.
- Add a workbench control bar with server-rendered filter links.
- Add a grouped FlightLeg card board above the existing table.
- Support grouping by release state, schedule window, and aircraft.
- Keep the existing Control Records table below the board.

## Boundaries

- Do not add schema, migrations, auth, signatures, release blocking, imports,
  provider integrations, file uploads, overrides, automatic snapshots, or
  `ReleasePackage`.
- Do not change release-control server actions.
- Do not change evidence workflow routes or forms.
- Do not remove the current table.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/operations-control` with default view.
- Smoke-check `?groupBy=release`, `?groupBy=schedule`, `?groupBy=aircraft`,
  `?release=planned`, and combined filters.
- Smoke-check `/operations-control/[flightLegId]`, `/flights`, `/aircraft`,
  `/crew`, `/scheduling`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.
- Browser-check the workbench board, grouping selector, filters, card links,
  and retained table.

## Assumptions

- The current Operations Control query has enough data for this slice.
- The board is server-rendered and URL-driven.
- Prompt 106 will validate the workbench behavior after implementation.

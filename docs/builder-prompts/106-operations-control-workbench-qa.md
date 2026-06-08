# Prompt 106: Operations Control Workbench QA

## Summary

Validate the Prompt 105 Operations Control workbench foundation on
`/operations-control`.

This is a QA/docs slice. Do not add app behavior unless a defect is found.

## QA Targets

- Confirm all grouping modes render: release, schedule, and aircraft.
- Confirm filters work independently and in combination.
- Confirm board cards preserve links to detail, edit, manifest, W&B, locating,
  and dispatch.
- Confirm the existing Control Records table still renders below the board.
- Confirm fallback or unassigned records do not break the board.
- Confirm no release actions or evidence workflows changed.

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

## Expected Result

The workbench is ready if all validation commands pass, grouping/filter URLs
render correctly, the existing table remains available, and no release/evidence
workflow behavior changes.

## Assumptions

- Prompt 106 does not add new app behavior.
- Prompt 107 should be planned separately after this QA result.

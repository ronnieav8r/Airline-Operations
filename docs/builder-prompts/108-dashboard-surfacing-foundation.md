# Prompt 108: Dashboard Surfacing Foundation

## Summary

Implement the Prompt 107 dashboard surfacing plan as a UI/read-only upgrade to
`/`.

The dashboard should become a quick Today + Attention surface while preserving
the existing operations dashboard sections and warning-only release behavior.

## Key Changes

- Extend dashboard reads to include FlightLeg release status and Operations
  Control attention summaries.
- Add an Operations Attention panel for release state, evidence readiness, and
  crew coverage gaps.
- Add a Priority FlightLegs list for current records needing attention.
- Add direct workflow links from today's flight board to FlightLeg detail,
  Manifest, W&B, Locating, and Dispatch.
- Add a clearly labeled AI Review Notes placeholder with no functionality.
- Preserve today's flight board, coverage gaps, active alerts, and fleet
  snapshot.

## AI Placeholder Rules

- The AI Review Notes panel is future-only.
- Do not call any AI provider.
- Do not add provider configuration.
- Do not persist notes.
- Do not add a recommendations engine, background job, or automation.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/`, `/operations-control`, one
  `/operations-control/[flightLegId]`, `/flights`, `/aircraft`, `/crew`,
  `/scheduling`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.
- Browser-check the dashboard attention panel, today's board, direct workflow
  links, AI placeholder, coverage gaps, alerts, and fleet snapshot.

## Assumptions

- Dashboard surfacing is read-only and UI-focused.
- `/operations-control` remains the full workbench.
- `/` should summarize attention and provide fast workflow entry points.
- Release behavior remains warning-only.
- Legacy import work remains deferred.

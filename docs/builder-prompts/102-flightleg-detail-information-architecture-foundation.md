# Prompt 102: FlightLeg Detail Information Architecture Foundation

## Summary

Implement the Prompt 101 command-center layout for
`/operations-control/[flightLegId]`.

This is a UI-only page organization slice. Keep existing data, routes, server
actions, evidence workflows, snapshots, release audit history, and warning-only
release behavior unchanged.

## Key Changes

- Add visible section navigation for:
  - Readiness.
  - Release History.
  - Aircraft/Airworthiness.
  - Evidence Details.
  - Raw Reference Data.
- Move Release Evidence Actions and Release Control into a top command-center
  area after the summary cards.
- Group recent preview snapshots and Release Audit Timeline under Release
  History.
- Group manifest, W&B, locating, and dispatch under Evidence Details.
- Keep raw weather and NOTAM payloads at the bottom under Raw Reference Data.

## Boundaries

- Do not add schema, migrations, auth, signatures, hard release blocking,
  imports, provider integrations, file uploads, overrides, automatic snapshots,
  or `ReleasePackage`.
- Do not change release-control server actions.
- Do not change evidence workflow routes or forms.
- Do not change the release evidence detail query unless a layout-only helper
  requires it.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/operations-control/[flightLegId]`, `/operations-control`,
  `/flights`, `/aircraft`, `/crew`, `/scheduling`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`.
- Browser-check one FlightLeg detail page and verify section navigation,
  command-center grouping, release controls, evidence links, snapshot links, and
  raw reference section.

## Assumptions

- The existing query already contains the data needed for this layout.
- Prompt 103 will perform QA/docs validation after this implementation.

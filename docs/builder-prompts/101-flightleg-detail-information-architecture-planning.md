# Prompt 101: FlightLeg Detail Information Architecture Planning

## Summary

Plan a UI-only reorganization of `/operations-control/[flightLegId]` using a
compact command-center layout with visible section navigation.

This slice is planning/docs only. Prompt 102 should implement the layout
change, and Prompt 103 should validate it.

## Key Decisions

- Use a compact command-center plus section navigation layout.
- Do not use tabs for this slice; safety and release status should remain
  visible on one page.
- Do not add collapsible sections yet; hidden evidence details could make early
  development QA harder.
- Keep all existing routes, server actions, evidence workflows, release
  actions, snapshots, and audit behavior unchanged.
- Do not add schema, auth, hard release blocking, imports, provider
  integrations, file uploads, or new release policy.

## Prompt 102 Target

Reorganize FlightLeg detail into these top-level areas:

- Header: back link, edit link, flight number, route, and schedule.
- Summary: existing FlightLeg, release, aircraft, and authority cards.
- Command Center: Release Evidence Actions and Release Control near the top.
- Section Navigation: anchor links for Readiness, Release History,
  Aircraft/Airworthiness, Evidence Details, and Raw Reference Data.
- Readiness: existing warning-only Release Readiness checklist and preview
  snapshot capture.
- Release History: recent preview snapshots plus release audit timeline.
- Aircraft/Airworthiness: assigned-aircraft configuration, airworthiness
  release, maintenance, discrepancy, and deferral context.
- Evidence Details: manifest, W&B, locating, and dispatch detail cards.
- Raw Reference Data: raw weather/NOTAM snapshots at the bottom.

Preserve these existing links:

- `/operations-control/[flightLegId]/edit`
- `/operations-control/[flightLegId]/manifest`
- `/operations-control/[flightLegId]/weight-balance`
- `/operations-control/[flightLegId]/locating`
- `/operations-control/[flightLegId]/dispatch`
- `/operations-control/[flightLegId]/snapshots/[snapshotId]`
- `/aircraft/[aircraftId]/airworthiness`

Keep the current data query shape unless a small layout-only helper extraction
is needed. Prefer page-level components in the existing detail page; do not add
a broad design system.

## Prompt 103 Target

Validate that:

- The page still renders with complete, partial, and missing evidence states.
- Release Control actions appear near the top and remain warning-only.
- Evidence workflow links, snapshot links, and aircraft airworthiness links
  still route correctly.
- The page is easier to scan through visible section navigation and grouped
  sections.
- No workflow behavior changes were introduced.

## Test Plan

Prompt 101 is docs/planning only; no app validation is required beyond review.

For Prompt 102 and Prompt 103:

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/operations-control/[flightLegId]`, `/operations-control`,
  `/flights`, `/aircraft`, `/crew`, `/scheduling`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`.
- Browser-check one FlightLeg detail page and verify the command-center layout,
  section navigation, release controls, evidence links, snapshot links, and raw
  reference section.

## Assumptions

- Prompt 102 is layout-only unless a small local component extraction is needed.
- Prompt 104 remains a separate planning session for Operations Control
  workbench improvements.
- Existing release behavior remains warning-only.

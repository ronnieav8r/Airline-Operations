# Prompt 107: Dashboard Surfacing Planning

## Summary

Plan a UI/read-only dashboard upgrade for `/` using Today + Attention.

The dashboard should keep today's flight board primary, add release/evidence
attention signals, add direct workflow links, and reserve visible space for
future AI review notes without implementing AI behavior.

## Key Decisions

- Prompt 107 is docs/planning only.
- Prompt 108 should implement the dashboard surface with no schema changes.
- Keep `/operations-control` as the full workbench.
- Use `/` as the quick "what needs attention today?" surface.
- Keep release behavior warning-only.
- Do not add mutations, schema, auth, hard release blocking, imports, provider
  integrations, file uploads, note persistence, AI calls, or new release policy.

## Prompt 108 Target

- Extend dashboard data enough to show release status and evidence status for
  today's FlightLeg-backed rows.
- Add an Operations Attention panel with counts for unreleased/planned,
  released, evidence ready, evidence partial/missing, and crew coverage gaps.
- Add a Priority FlightLegs list for today or current records needing
  attention, sorted by scheduled departure.
- Improve today's flight board with direct action links for Detail, Manifest,
  W&B, Locating, and Dispatch when a FlightLeg exists.
- Add a clear link to `/operations-control` and useful workbench links where
  practical.
- Add an AI Review Notes placeholder near the attention area.
- Preserve the existing dashboard sections for today's board, coverage gaps,
  active alerts, and fleet snapshot.
- Keep implementation read-only and page-level; do not introduce a broad design
  system.

## AI Review Notes Placeholder

Prompt 108 should add a visible placeholder card or panel for future AI review
notes.

Minimum behavior:

- Label it clearly as a future placeholder.
- Explain that future notes may summarize release readiness, evidence gaps,
  crew/aircraft issues, and operational follow-ups.
- Do not call any AI provider.
- Do not add provider configuration.
- Do not persist notes.
- Do not add a recommendations engine, automation, or hidden background work.

## Prompt 109 Target

- Confirm `/` renders with today's flights, the attention panel, workflow
  links, and the AI placeholder.
- Confirm the AI placeholder is non-functional and does not call provider code.
- Confirm dashboard links route to FlightLeg detail, Manifest, W&B, Locating,
  Dispatch, and Operations Control.
- Confirm existing dashboard sections still render.
- Confirm no release actions or evidence workflows changed.

## Test Plan

Prompt 107 is docs/planning only.

For Prompt 108 and Prompt 109:

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
- AI review space is only a placeholder in this slice.
- Future AI review may eventually inspect readiness, evidence gaps,
  crew/aircraft issues, and operational notes, but no such logic is added now.
- Legacy import work remains deferred.

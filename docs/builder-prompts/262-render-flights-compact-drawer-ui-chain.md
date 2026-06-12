# Prompt 262: Render Flights Restore And Compact Drawer UI Chain

## Summary

Restore Render demo flight visibility and continue the frontend IA pass across the main operational pages.

## Implementation

- Verify the Render database has next-30-day `FlightLeg` rows.
- If missing, run only the gated monthly operations demo seed against Render.
- Keep the Render database URL out of tracked files.
- Compact `/flights` header, metrics, and filters.
- Add a shared context drawer shell.
- Move Dashboard and Flights drawers onto the shared shell.
- Add quick-review drawers to `/aircraft`, `/crew`, and `/scheduling`.
- Compact the Aircraft, Crew, and Scheduling top metric areas.
- Keep all drawer content read-only and preserve existing workflow routes.

## Acceptance

- Render `/flights?range=30d&status=all&release=all&issue=all` no longer shows the empty state.
- Local `/flights`, `/aircraft`, `/crew`, and `/scheduling` drawer URLs return 200.
- Existing workflows and route permissions are unchanged.
- Validation, build, app smoke, and browser smoke pass.

## Boundaries

- No schema changes.
- No release behavior changes.
- No new workflow mutations.
- Drawers are quick-look context only; full workflows stay on dedicated pages.

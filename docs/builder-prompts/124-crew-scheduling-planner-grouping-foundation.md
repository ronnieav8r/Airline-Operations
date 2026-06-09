# Prompt 124: Crew Scheduling Planner Grouping Foundation

## Summary

Add URL-driven grouping to `/crew/scheduling` so the filtered crew list can be
scanned by availability, base, assignment state, or duty state.

## Scope

- Add `groupBy=availability|base|assignment|duty`.
- Default grouping is `availability`.
- Preserve all Prompt 122 filters.
- Render visible group sections with crew counts.
- Show a readable empty group state when active filters leave a group empty.

## Guardrails

- Do not add schema.
- Do not add schedule writes or time-off writes.
- Do not mutate aircraft crew assignments or FlightLeg crew snapshots.
- Do not add duty/rest enforcement, assignment automation, auth/signatures,
  release blocking, imports, provider integrations, or file uploads.

## Test Plan

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Smoke-check `/crew/scheduling` plus grouping URLs for availability, base,
  assignment, and duty.
- Confirm grouping works with active filters.

## Status

Implementation complete. Grouping is read-only and URL-driven.

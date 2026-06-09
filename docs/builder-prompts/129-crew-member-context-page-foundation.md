# Prompt 129: Crew Member Context Page Foundation

## Summary

Implement the read-only crew member context page planned in Prompt 128. Add
`/crew/[crewMemberId]` and cross-links from crew roster, crew planner, and
aircraft crew workflow surfaces.

## Scope

- Add a focused crew member context query helper.
- Add `app/crew/[crewMemberId]/page.tsx`.
- Add crew detail links from `/crew`, `/crew/scheduling`, and
  `/aircraft/[aircraftId]/crew`.
- Keep the page read-only.
- Do not add schema, schedule writes, time-off writes, assignment automation,
  duty/rest enforcement, auth/signatures, release blocking, imports, or
  provider integrations.

## Status

Implemented. Prompt 130 should validate route rendering, cross-links, and
unchanged workflow behavior.

# Prompt 130: Crew Member Context Page QA

## Summary

Validate the read-only crew member context page and cross-links added in Prompt
129.

Prompt 130 is QA/docs only unless a defect is found.

## QA Scope

- Validate `/crew/[crewMemberId]` renders for a seeded crew member.
- Confirm `/crew`, `/crew/scheduling`, and `/aircraft/[aircraftId]/crew`
  include `Crew detail` links.
- Confirm the crew detail page shows availability, qualifications, current
  aircraft assignments, schedule, time off, and upcoming coverage sections.
- Confirm aircraft crew workflow links remain available.
- Confirm Operations Control and diagnostics still load.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local route smoke.
- Browser checks for `/crew`, `/crew/scheduling`, `/crew/[crewMemberId]`, and
  `/aircraft/[aircraftId]/crew`.

## Status

QA complete. The crew detail route and cross-links render locally, and no
workflow behavior changed.

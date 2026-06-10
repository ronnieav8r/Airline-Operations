# Prompt 203: Cross-Link Polish

## Summary

Add small navigation polish across crew scheduling, aircraft assignment, crew
detail, and crew logistics surfaces. This is navigation-only work.

## Scope

- Add crew roster links to crew logistics management.
- Add aircraft context assignment-card links to crew detail, logistics, and
  filtered planner views.
- Add aircraft crew workflow links to crew logistics.
- Add logistics need links back to aircraft context, aircraft crew workflow,
  and filtered planner views.

## Boundaries

- No schema changes.
- No new workflows or mutations.
- No booking, expense, assignment, schedule, release, duty/rest, import, or
  provider behavior changes.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Runtime/browser link smoke when Docker Desktop is available.

# Prompt 188: Pattern Application QA

## Summary

QA the rotation pattern application preview and generate-drafts foundation from
Prompts 186-187. This is a QA/documentation slice unless a defect is found.

## QA Scope

- Validate static checks.
- Confirm local DB prep status.
- Verify expected behavior:
  - Pattern preview is URL-driven and read-only.
  - Preview rows show duty, time, station, cycle day, and warning-only
    conflicts.
  - Generate action requires admin/ops.
  - Generate action creates only `DRAFT` `CrewScheduleEntry` rows.
  - Generated rows link to the selected rotation pattern.
  - Exact duplicates are skipped.
  - No `CrewSchedule` bridge rows are created by generation.
  - Publishing remains separate.
  - No `AircraftCrewAssignment` rows are changed.

## Runtime QA Status

DB-backed runtime QA is pending in this session because Docker Desktop is not
available. The local DB prep command could not connect to Docker Desktop's
Linux engine.

## Static Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

## Follow-Up Runtime Smoke

When Docker Desktop is available:

1. Start the local database and app.
2. Log in as a seeded admin or ops user.
3. Open `/crew/scheduling/periods/[periodId]`.
4. Preview a pattern for a crew member and date window.
5. Generate draft entries.
6. Confirm entries are `DRAFT` and linked to the pattern.
7. Generate the same range again and confirm duplicates are skipped.
8. Confirm planner and crew detail show draft planning context.
9. Confirm no `CrewSchedule` bridge rows are created until publish.
10. Confirm `AircraftCrewAssignment` row counts are unchanged.

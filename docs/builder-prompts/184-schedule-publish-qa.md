# Prompt 184: Schedule Publish QA

## Summary

QA the Prompt 183 schedule publish foundation. This is a QA/documentation slice
unless a defect is found. Publishing must remain a crew availability/planning
workflow and must not mutate aircraft assignments.

## QA Scope

- Validate static build checks.
- Confirm local DB prep status.
- Verify the publish workflow expectations:
  - Publish requires admin/ops.
  - Draft entries become `PUBLISHED`.
  - Parent period becomes `PUBLISHED`.
  - One linked `CrewSchedule` bridge row exists per published entry.
  - Repeated publish updates existing bridge rows rather than creating
    duplicates.
  - Published period edit form is hidden.
  - Aircraft assignments are not created, replaced, ended, or otherwise
    mutated.
- Confirm planner and crew detail surfaces remain the visibility path for
  published schedule availability.

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
2. Log in as the seeded admin or ops user.
3. Open `/crew/scheduling/periods`.
4. Open a period with draft entries.
5. Publish the period.
6. Confirm entries and period show `PUBLISHED`.
7. Confirm linked `CrewSchedule` bridge status shows linked.
8. Publish again and confirm no duplicate bridge rows are created.
9. Confirm `/crew/scheduling` and `/crew/[crewMemberId]` show the published
   availability context.
10. Confirm `AircraftCrewAssignment` row counts are unchanged.

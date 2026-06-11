# Prompt 247: Crew Scheduling Docs Refresh

## Summary

Close the Crew Scheduling runtime hardening batch with current status docs.
This slice is docs-only.

## Completed Docs Work

- Added `docs/CREW_SCHEDULING_MVP_STATUS.md`.
- Updated scheduling QA, architecture, module, backend-MVP, and project-status
  docs to reflect completed runtime QA.

## Current Boundary

- Crew Scheduling is backend MVP-complete for planning/availability workflows.
- `AircraftCrewAssignment` remains operational coverage truth.
- Published schedules create/read linked `CrewSchedule` bridge rows.
- Crew portal users can submit allowed requests only.
- No assignment automation, duty/rest hard enforcement, imports, signatures,
  provider integrations, or frontend polish are included.

## Validation

- Docs-only review.
- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`

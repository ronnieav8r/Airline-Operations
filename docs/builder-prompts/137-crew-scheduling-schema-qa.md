# Prompt 137: Crew Scheduling Schema QA

## Summary

Validate the additive crew scheduling schema foundation from Prompt 136.

Prompt 137 is QA/docs only unless a defect is found.

## QA Scope

- Confirm local migrations are current.
- Confirm local seed creates nonzero scheduling foundation rows.
- Confirm `/api/health` reports counts for:
  - `crewSchedulePeriods`
  - `crewScheduleRequests`
  - `crewRotationPatterns`
  - `crewRotationPatternDays`
  - `crewScheduleEntries`
- Confirm existing crew and operations routes still load.
- Confirm no schedule writes, publishing actions, crew portal/auth, duty/rest
  enforcement, assignment automation, positioning logistics, imports, or
  provider integrations were added.

## Validation

- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local route/API smoke checks.

## Status

QA complete. The additive schema foundation validates locally, seeded counts
are nonzero, health counts are visible, and existing routes remain available.

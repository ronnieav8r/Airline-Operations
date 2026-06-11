# Prompt 242: Crew Scheduling Runtime QA Planning

## Summary

Plan the DB-backed runtime QA pass for the Crew Scheduling backend MVP. This is
planning/docs only. It exists because several earlier scheduling QA slices
passed static validation while Docker-backed workflow QA was pending.

## QA Scope

Prompt 243 should runtime-test schedule periods and publishing.

Prompt 244 should runtime-test rotation pattern preview and draft generation.

Prompt 245 should runtime-test admin request review and time-off workflows.

Prompt 246 should runtime-test crew portal scoping and request submission.

Prompt 247 should refresh Crew Scheduling docs/status after the runtime QA
chain.

## Product Boundaries

- `AircraftCrewAssignment` remains the operational coverage source.
- `CrewScheduleEntry` and `CrewSchedule` remain planning/availability records.
- Publishing may create/update linked `CrewSchedule` bridge rows.
- Pattern application may create draft `CrewScheduleEntry` rows only.
- Request review and time-off review must not publish schedules or mutate
  aircraft assignments.
- Crew portal users may submit allowed requests only.
- No schema changes, duty/rest hard enforcement, assignment automation,
  provider integrations, imports, signatures, or frontend polish are included.

## Validation Plan

Each runtime QA slice should run:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

Feature-specific QA should use direct DB assertions or small smoke helpers when
that is safer than browser-only verification.

## Stop Conditions

Stop and plan if QA exposes a product decision about:

- automatic assignment from schedules,
- hard duty/rest enforcement,
- legal signature requirements,
- schedule import/apply behavior,
- crew request entitlement policy,
- destructive cleanup of schedule records.

# Prompt 193: Scheduling Lifecycle Docs/Status Refresh

## Summary

Refresh docs and project status after completing the crew scheduling lifecycle
chain. The completed chain covers schedule publishing, rotation-pattern
application into draft entries, and admin review of period-scoped crew schedule
requests.

## Completed Chain

- Prompt 182: Schedule publish/finalize planning.
- Prompt 183: Schedule publish foundation.
- Prompt 184: Schedule publish QA.
- Prompt 185: Rotation pattern application planning.
- Prompt 186: Pattern application preview.
- Prompt 187: Pattern generate-drafts foundation.
- Prompt 188: Pattern application QA.
- Prompt 189: Crew schedule request workflow planning.
- Prompt 190: Admin request review foundation.
- Prompt 191: Request-to-draft-entry helper.
- Prompt 192: Crew request workflow QA.
- Prompt 193: Scheduling lifecycle docs/status refresh.

## Current Boundary

Crew Scheduling now supports a controlled admin lifecycle:

- manually create draft schedule entries,
- generate draft entries from rotation patterns,
- review broader period-scoped crew schedule requests,
- link approved pattern requests to generated draft entries,
- publish a schedule period into linked `CrewSchedule` bridge rows.

Operational coverage still comes from `AircraftCrewAssignment`. Published
schedule availability does not assign crew to aircraft.

## Remaining Runtime QA

Static validation passed for the chain. DB-backed workflow and browser smoke
for publish, pattern generation, and request review remains pending because
Docker Desktop was not available in this session.

## Next Macro Step

Prompt 194 should plan the Crew Self-Service portal:

- crew-only view of profile, schedules, time off, requests, assignments, and
  compliance warnings,
- no approval rights for crew role,
- no assignment changes by crew role,
- no logistics implementation yet.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

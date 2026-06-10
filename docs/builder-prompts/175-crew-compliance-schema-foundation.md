# Prompt 175: Crew Compliance Schema Foundation

## Summary

Prompt 175 adds the additive crew compliance schema foundation. It creates
separate evidence tables for certificates, medicals, training, checks,
recency, duty, and rest while preserving existing `CrewQualification`,
`AircraftCrewAssignment`, `CrewLegAssignment`, and crew scheduling behavior.

No UI, CRUD workflow, seed/backfill data, release blocking, duty/rest legal
enforcement, imports, file uploads, provider integrations, or signature
behavior is included.

## Implemented Scope

- Added additive Prisma enums for crew compliance record status, certificate
  type, medical class, training event type, check event type, compliance result,
  recency event type, duty-period status, and rest-period status.
- Added additive Prisma models:
  - `CrewCertificate`
  - `CrewMedical`
  - `CrewTrainingEvent`
  - `CrewCheckEvent`
  - `CrewRecencyEvent`
  - `CrewDutyPeriod`
  - `CrewRestPeriod`
- Added relation arrays on `CrewMember` and `User`.
- Added nullable user attribution fields for created/verified tracking.
- Added indexes for crew/status/date/expiry/attribution lookups.
- Added migration `20260610180000_crew_compliance_schema_foundation`.
- Updated `/api/health` counts for the new tables.
- Updated current and planning DBML docs.

## Boundaries

- Existing `CrewQualification` remains in place for current compatibility
  warnings.
- `AircraftCrewAssignment` remains operational coverage truth.
- `CrewSchedule` and `CrewScheduleEntry` remain planning/availability context.
- Release readiness and assignment workflows remain warning-first.
- Seed/demo compliance rows are deferred to Prompt 176.
- Read-only surfaces are deferred to Prompt 177.

## Validation

- `npm run prisma:validate`: pass.
- `npm run prisma:generate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Local migration smoke is pending. Docker Desktop was unavailable, and the
local database start command could not connect to the Docker Desktop Linux
engine.

## Prompt 176 Target

Add safe demo seed/backfill data and health-count QA for the new compliance
tables. Keep seed idempotent and do not add UI or workflow changes.

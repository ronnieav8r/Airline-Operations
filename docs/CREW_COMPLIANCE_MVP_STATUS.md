# Crew Compliance MVP Status

Last updated: 2026-06-11

## Status

Crew compliance backend is MVP-complete for the current warning-only product
policy.

Implemented backend capabilities:

- Additive compliance schema for certificate, medical, training, check,
  recency, duty, and rest records.
- Demo seed/backfill support for representative compliance evidence.
- Read-only compliance surfaces on crew detail and crew scheduling.
- Warning-only compliance context in aircraft crew assignment.
- Warning-only compliance context in FlightLeg release readiness.
- Ops/admin compliance management route:
  `/crew/[crewMemberId]/compliance`.
- Admin workflows for:
  - `CrewCertificate`,
  - `CrewMedical`,
  - `CrewTrainingEvent`,
  - `CrewCheckEvent`,
  - `CrewRecencyEvent`,
  - `CrewDutyPeriod`,
  - `CrewRestPeriod`.
- Local smoke coverage for compliance writes, route access, and role redirects.

## MVP Boundaries

- Compliance records are evidence and warning inputs.
- Compliance records do not assign crew to aircraft.
- Compliance records do not publish crew schedules.
- Compliance records do not hard-block FlightRelease actions.
- `verifiedById` and `verifiedAt` are internal review metadata, not legal
  signatures.

## Deferred Post-MVP

- Legal duty/rest enforcement engine.
- Formal signatures.
- Document/file uploads.
- FAA/provider-backed verification.
- Crew self-service compliance uploads.
- Legacy compliance import execution.
- Hard release blocking.

## Current Validation

Prompt 234 completed compliance admin QA:

- Static validation passed.
- Local DB migration and seed passed.
- Workflow smoke passed with run label `SMOKE-20260611134924`.
- App route smoke passed across seeded roles.
- Browser smoke passed.

# Prompt 208: Duty/Rest Warning Calculator Foundation

## Summary

Implement the first warning-only duty/rest calculator planned in Prompt 207.
This slice surfaces one duty/rest item in FlightLeg release readiness and lets
existing readiness snapshot capture persist the result.

## Implemented Scope

- Added a reusable duty/rest evaluator for current FlightLeg release readiness.
- Used existing duty/rest policy settings and crew duty/rest evidence.
- Kept release, assignment, scheduling, and portal workflows warning-only.
- Stored detailed subfindings in the existing release-readiness finding details
  JSON through the existing snapshot pipeline.

## First Calculator Boundary

Supported in this slice:

- Ordinary Part 91 guardrail/info behavior.
- Part 135 unscheduled/on-demand warning behavior using visible crew duty/rest
  records and planned FlightLeg schedule.
- Missing-input/deferred messages for outside commercial flying, transportation,
  reserve/standby detail, Part 91K, scheduled Part 135, augmented crew, flight
  attendants, HEMES, OpSpecs/MSpecs, and legal enforcement.

Not implemented:

- Hard release blocking.
- Legal signoff or signatures.
- Duty/rest write workflows.
- Outside commercial flying ledger.
- Transportation classification.
- Dedicated `CrewDutyRestWarning` table.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local route/workflow smoke for FlightLeg detail and snapshot capture.

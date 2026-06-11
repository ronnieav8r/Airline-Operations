# Prompt 233: Duty And Rest Admin Foundation

## Summary

Prompt 233 extends `/crew/[crewMemberId]/compliance` with admin workflows for
visible duty and rest records used by warning-only duty/rest review.

## Implemented Scope

- Added create/update/review/cancel actions for `CrewDutyPeriod`.
- Added create/update/review/cancel actions for `CrewRestPeriod`.
- Extended the compliance admin page with create forms and existing-record edit
  sections for duty and rest periods.
- Set `createdById` on create and `verifiedById`/`verifiedAt` on review.
- Validated required start times, optional end times, and start/end ordering.
- Extended workflow smoke to create, review, and cancel duty/rest records.

## Boundaries

- No schema changes.
- No regulatory hard enforcement.
- No outside flying ledger.
- No transportation classification.
- No reduced-rest compensation logic.
- No reserve/standby depth.
- No release blocking.
- No legal signatures.

## Validation Target

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local DB migrate/seed
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

## Next Slice

Prompt 234 should QA compliance warning integration across crew detail, crew
planner, aircraft assignment, and release readiness.

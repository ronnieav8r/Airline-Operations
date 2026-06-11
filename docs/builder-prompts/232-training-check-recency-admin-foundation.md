# Prompt 232: Training, Check, And Recency Admin Foundation

## Summary

Prompt 232 extends `/crew/[crewMemberId]/compliance` with admin workflows for
training, check, and recency records.

## Implemented Scope

- Added create/update/review/void actions for `CrewTrainingEvent`.
- Added create/update/review/void actions for `CrewCheckEvent`.
- Added create/update/review/void actions for `CrewRecencyEvent`.
- Extended the compliance admin page with create forms and existing-record edit
  sections for training, checks, and recency.
- Set `createdById` on create and `verifiedById`/`verifiedAt` on review.
- Validated required dates, enum values, quantity, and basic date windows.
- Extended workflow smoke to create, review, and void training/check/recency
  records.

## Boundaries

- No schema changes.
- No duty/rest admin writes yet.
- No hard enforcement or release blocking.
- No legal signatures.
- No file uploads.
- No provider verification.
- No crew self-service compliance submission.

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

Prompt 233 should add duty and rest admin workflows to the same compliance
route.

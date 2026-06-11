# Prompt 231: Certificate And Medical Admin Foundation

## Summary

Prompt 231 adds the first crew compliance admin workflow at
`/crew/[crewMemberId]/compliance`.

## Implemented Scope

- Added admin/ops-only route `/crew/[crewMemberId]/compliance`.
- Added create/update/review/void actions for `CrewCertificate`.
- Added create/update/review/void actions for `CrewMedical`.
- Set `createdById` on create and `verifiedById`/`verifiedAt` on review.
- Validated enum inputs and issue/expiry date ordering.
- Linked crew detail to the compliance management route.
- Added app smoke coverage for admin/ops access and non-admin redirects.

## Boundaries

- No schema changes.
- No training/check/recency writes yet.
- No duty/rest writes yet.
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

Prompt 232 should extend the same route with training, check, and recency admin
workflows.

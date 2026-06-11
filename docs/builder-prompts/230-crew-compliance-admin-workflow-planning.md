# Prompt 230: Crew Compliance Admin Workflow Planning

## Summary

Plan ops/admin create/edit workflows for crew compliance records. The schema
already exists, so the next slices should add controlled backend workflows
without adding schema or enforcement.

Selected route direction: add a crew-scoped compliance management surface at
`/crew/[crewMemberId]/compliance`, linked from crew detail, crew roster, crew
planner, and aircraft crew assignment warning surfaces where practical.

## Workflow Boundary

Crew compliance admin answers:

```text
What certificates, medicals, training, checks, recency, duty, and rest evidence
has ops/admin recorded or reviewed for this crew member?
```

It does not answer:

```text
Is this crew member legally releasable under every regulation and OpSpec?
```

That remains a warning-calculator and later enforcement problem.

## Role Policy

- Create/edit/void/review compliance records: `ADMIN` and `OPS`.
- Read compliance records: existing authenticated operational surfaces may keep
  their current read access.
- Crew self-service upload/edit of compliance records remains deferred.
- `verifiedById` and `verifiedAt` should be treated as internal review metadata,
  not legal signature fields.

## Prompt 231 Target: Certificate And Medical Admin Foundation

- Add `/crew/[crewMemberId]/compliance`.
- Show existing certificates and medicals in grouped cards/tables.
- Add create/edit forms for `CrewCertificate` and `CrewMedical`.
- Support status changes to `ACTIVE`, `EXPIRED`, `SUPERSEDED`, and `VOIDED`.
- Add a "Mark reviewed" action that sets `verifiedById` and `verifiedAt`.
- Set `createdById` from the current user on create.
- Validate required crew member, enum values, and date ordering when both issue
  and expiry dates are present.
- Do not add file uploads, legal signatures, provider verification, or hard
  blocking.

## Prompt 232 Target: Training, Check, And Recency Admin Foundation

- Extend `/crew/[crewMemberId]/compliance` with sections for:
  - `CrewTrainingEvent`.
  - `CrewCheckEvent`.
  - `CrewRecencyEvent`.
- Add create/edit/review/void actions for those records.
- Validate required event type, required dates, result/status enum values, and
  basic date windows.
- Preserve history; do not delete records.
- Keep warning-only surfaces downstream.

## Prompt 233 Target: Duty And Rest Admin Foundation

- Extend `/crew/[crewMemberId]/compliance` with sections for:
  - `CrewDutyPeriod`.
  - `CrewRestPeriod`.
- Add create/edit/review/cancel actions for duty and rest records.
- Validate start/end date ordering and status enum values.
- Keep the duty/rest calculator warning-only.
- Do not add regulatory hard enforcement, outside flying ledger, transportation
  classification, reduced-rest compensation, or reserve/standby depth.

## Prompt 234 Target: Crew Compliance Warning Integration QA

- Runtime-test that new compliance records appear on:
  - `/crew/[crewMemberId]`.
  - `/crew/[crewMemberId]/compliance`.
  - `/crew/scheduling`.
  - `/aircraft/[aircraftId]/crew`.
  - `/operations-control/[flightLegId]` release readiness.
- Confirm warning behavior updates when records are active/expired/voided.
- Confirm saves are not blocked by warnings.
- Confirm release actions remain warning-only.

## Prompt 235 Target: Crew Compliance Docs Refresh

- Mark compliance admin workflows as backend-MVP complete.
- Document that records are admin-managed evidence and warning inputs.
- Keep post-MVP items deferred: legal enforcement, signatures, uploads,
  provider verification, imports, and crew self-service compliance submission.

## Test Plan For Implementation Slices

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
- Browser-check `/crew/[crewMemberId]/compliance`.

## Assumptions

- No schema changes are needed.
- Compliance records are historical evidence and should be status-changed rather
  than deleted.
- Review metadata is internal QA/ops review only, not a legal signature.
- Warning-first policy remains in force.

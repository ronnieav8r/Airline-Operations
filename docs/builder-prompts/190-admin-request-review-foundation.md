# Prompt 190: Admin Request Review Foundation

## Summary

Implement admin/ops approve and deny review for submitted
`CrewScheduleRequest` rows. Approval is planning input only and does not create
schedule entries, publish schedules, create `CrewSchedule` bridge rows, or
mutate aircraft assignments.

## Key Changes

- Add review controls on `/crew/scheduling/periods/[periodId]` request cards.
- Require `ADMIN` or `OPS`.
- Allow approve/deny only while request status is `SUBMITTED`.
- Record `status`, `reviewedAt`, `reviewedById`, and optional `reviewNotes`.
- Reject review when the request does not belong to the current period.
- Reject review when the request is already reviewed or otherwise
  non-submitted.
- Keep request approval side effects limited to the request row.

## Boundaries

- No request submission UI.
- No crew self-service portal.
- No schedule-entry creation from request approval.
- No publishing.
- No `CrewSchedule` bridge rows.
- No aircraft assignment mutation.
- No duty/rest hard enforcement.
- No schema changes.

## Prompt 191 Target

Add a request-to-draft-entry helper for approved requests only. The helper may
prefill pattern preview/generation or manual draft-entry inputs and should link
created draft entries to `sourceRequestId`. It must still create only draft
planning entries.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB/browser smoke when Docker Desktop is available.

## Status

Implemented in Prompt 190. Static validation passed. DB-backed runtime/browser
smoke is pending when Docker Desktop is available.

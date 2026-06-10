# Prompt 189: Crew Schedule Request Workflow Planning

## Summary

Plan the admin workflow for broader period-scoped `CrewScheduleRequest` rows.
This is separate from the simple `TimeOffRequest` absence workflow. The first
implementation should review existing/submitted schedule requests and must not
automatically generate schedules or aircraft assignments.

## Key Decisions

- `TimeOffRequest` remains the simple absence workflow at
  `/crew/scheduling/time-off`.
- `CrewScheduleRequest` is the broader period-scoped bid/preference/swap/note
  table.
- First workflow is admin/ops review, not crew self-service submission.
- First review actions are `APPROVED` and `DENIED` for `SUBMITTED` requests.
- `WITHDRAWN` remains reserved for future crew self-service or admin correction
  planning.
- Approval means the request is accepted as planning input only.
- Approval must not create `CrewScheduleEntry` rows yet.
- Approval must not publish schedules.
- Approval must not create, replace, or end aircraft assignments.
- Review should record `reviewedAt`, `reviewedById`, and optional
  `reviewNotes`.

## Prompt 190 Target: Admin Request Review Foundation

Implement review controls for `CrewScheduleRequest`.

Minimum behavior:

- Add review controls on `/crew/scheduling/periods/[periodId]` near the request
  list.
- Require `ADMIN` or `OPS`.
- Show requests grouped or clearly labeled by status.
- Show request type, crew member, date window, preferred duty status, requested
  pattern, requested swap crew member, request notes, and review notes.
- Support approve and deny actions for `SUBMITTED` requests.
- Set `reviewedAt`, `reviewedById`, `status`, and `reviewNotes`.
- Reject review when the request does not belong to the period.
- Reject review when the request is not `SUBMITTED`.
- Keep all conflicts warning-only and do not write schedule entries.

## Prompt 191 Target: Request-To-Draft-Entry Helper

Add a controlled helper for approved requests only.

Minimum behavior:

- For approved `PATTERN_REQUEST`, allow prefilled pattern preview/generate
  inputs from the request.
- For approved preferred work/off day requests, allow a prefilled manual draft
  entry form if practical.
- Link generated or created draft entries to `sourceRequestId`.
- Keep entries `DRAFT`.
- Do not publish.
- Do not create `CrewSchedule` bridge rows.
- Do not mutate aircraft assignments.

## Prompt 192 QA Target

- Review submitted requests as approved and denied.
- Confirm reviewed timestamps and reviewer attribution.
- Confirm non-submitted requests cannot be reviewed again.
- Confirm request approval does not create schedule entries.
- Confirm request-to-draft helper creates only draft entries and links
  `sourceRequestId`.
- Confirm no publishing or aircraft assignment changes occur.

## Boundaries

- No crew self-service portal.
- No request submission UI for crew members.
- No automatic schedule generation from approved requests.
- No publish side effects.
- No aircraft assignment automation.
- No duty/rest hard enforcement.
- No schema changes.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB/browser smoke when Docker Desktop is available.

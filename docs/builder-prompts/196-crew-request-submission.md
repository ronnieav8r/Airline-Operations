# Prompt 196: Crew Request Submission

## Summary

Add crew-scoped request submission to `/crew/portal`. Crew users can submit
their own `TimeOffRequest` and `CrewScheduleRequest` rows. Admin/ops review is
still required before a request is approved or used for scheduling.

## Key Changes

- Add portal server actions for time-off request submission.
- Add portal server actions for schedule request submission.
- Scope submissions to the current user's linked `CrewMember`.
- Set `requestedById` or `submittedById` to the current user.
- Create time-off requests with `PENDING` status.
- Create schedule requests with `SUBMITTED` status.
- Show request forms and feedback on `/crew/portal`.

## Boundaries

- Crew cannot submit for another crew member.
- Crew cannot approve, deny, cancel, or withdraw requests in this slice.
- No schedule entries are generated automatically.
- No schedule publishing.
- No `CrewSchedule` bridge rows.
- No aircraft assignment changes.
- No logistics writes.
- No schema changes.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB/browser smoke when Docker Desktop is available.

## Status

Implemented in Prompt 196. Static validation passed. DB-backed runtime/browser
smoke is pending when Docker Desktop is available.

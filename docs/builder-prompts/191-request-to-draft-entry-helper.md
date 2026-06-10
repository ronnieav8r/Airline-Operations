# Prompt 191: Request-To-Draft-Entry Helper

## Summary

Add a controlled helper that lets approved `CrewScheduleRequest` rows feed draft
schedule planning. The first supported helper is for approved pattern requests:
prefill the pattern preview from the request and generate draft entries linked
back to `sourceRequestId`.

## Key Changes

- Add source request support to pattern preview/generate inputs.
- On approved `PATTERN_REQUEST` cards with a requested pattern, show a link to
  preview that request.
- Generated draft entries from that helper must set `sourceRequestId`.
- Validate source request belongs to the same period and crew member.
- Require source request status `APPROVED`.
- Keep generated rows `DRAFT`.

## Boundaries

- No schedule publishing.
- No `CrewSchedule` bridge rows.
- No aircraft assignment mutation.
- No automatic generation at request approval time.
- No crew self-service portal.
- No new schema.
- No duty/rest hard enforcement.

## Prompt 192 QA Target

- Approve a pattern request.
- Use its request-to-preview link.
- Generate draft entries.
- Confirm generated entries are `DRAFT`.
- Confirm generated entries link to `sourceRequestId`.
- Confirm no `CrewSchedule` bridge rows are created.
- Confirm no publish or aircraft assignment behavior changes.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB/browser smoke when Docker Desktop is available.

## Status

Implemented in Prompt 191. Static validation passed. DB-backed runtime/browser
smoke is pending when Docker Desktop is available.

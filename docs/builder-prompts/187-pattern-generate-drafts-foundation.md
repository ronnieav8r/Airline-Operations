# Prompt 187: Pattern Generate-Drafts Foundation

## Summary

Add the explicit write action that generates draft `CrewScheduleEntry` rows
from the Prompt 186 pattern preview inputs. Generated rows remain planning
records only.

## Key Changes

- Add a protected generate-drafts action on schedule period detail.
- Require `ADMIN` or `OPS`.
- Reuse the preview form input shape:
  - crew member,
  - rotation pattern,
  - start date,
  - optional end date,
  - day count when no end date is supplied.
- Validate period, active crew member, active pattern, date window, and pattern
  day rows.
- Create only `DRAFT` `CrewScheduleEntry` rows.
- Set `rotationPatternId` on generated entries.
- Skip exact duplicates for the same period, crew member, date, and duty
  status.
- Redirect back with generated/skipped counts.

## Boundaries

- No `CrewSchedule` bridge rows.
- No schedule publishing.
- No request review.
- No aircraft assignment mutation.
- No duty/rest hard enforcement.
- No schema changes.

## Prompt 188 QA Target

- Preview and generate draft rows.
- Confirm generated rows are `DRAFT`.
- Confirm generated rows are linked to the selected rotation pattern.
- Run generation twice and confirm duplicate rows are skipped.
- Confirm publish remains separate.
- Confirm no `CrewSchedule` bridge rows are created by generation.
- Confirm no `AircraftCrewAssignment` rows are changed.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB/browser smoke when Docker Desktop is available.

## Status

Implemented in Prompt 187. Static validation passed. DB-backed runtime/browser
smoke is pending when Docker Desktop is available.

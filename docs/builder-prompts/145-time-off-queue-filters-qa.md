# Prompt 145: Time-Off Queue Filters QA

## Summary

Validate the URL-driven filters added to `/crew/scheduling/time-off` in Prompt
144. This is a QA/docs-only slice because no defect was found.

## Validation Results

Status: passed.

- `npm run prisma:validate` passed.
- `npm run typecheck` passed after build regenerated route metadata.
- `npm run lint` passed.
- `npm run build` passed.

## Filter QA

- Default queue route returned 200.
- Status-only filter returned 200.
- Request-type-only filter returned 200.
- Crew-member-only filter returned 200.
- Combined status, crew member, request type, and date-window filter returned
  200.
- Browser QA confirmed the filter form, active-filter summary, and reset link
  render.

## Filtered Workflow QA

- Created three local QA requests from a filtered queue URL.
- Confirmed create actions returned to the filtered URL.
- Approved, denied, and cancelled requests from the filtered queue.
- Confirmed review actions returned to the filtered URL.
- Confirmed statuses and `reviewedAt` values in the local database.

## Side-Effect Check

Before filtered QA:

- `timeOffRequests`: 4.
- `crewSchedules`: 3.
- `crewScheduleEntries`: 3.
- `aircraftCrewAssignments`: 5.
- `crewLegAssignments`: 13.

After filtered QA:

- `timeOffRequests`: 7.
- `crewSchedules`: 3.
- `crewScheduleEntries`: 3.
- `aircraftCrewAssignments`: 5.
- `crewLegAssignments`: 13.

Only `TimeOffRequest` rows changed.

## Result

Prompt 145 is complete. The Prompt 142-145 time-off workflow and filter chain
is complete.

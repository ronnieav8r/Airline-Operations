# Prompt 146: Schedule Period Create/Edit Planning

## Summary

Plan the first write workflow for `CrewSchedulePeriod`. This workflow lets
ops/admin users create, edit, and archive schedule periods. It does not publish
schedules, generate schedule entries, apply rotation patterns, review crew
requests, or create aircraft assignments.

## Key Decisions

- Use existing `CrewSchedulePeriod`; no schema changes.
- Implement under existing `/crew/scheduling/periods` routes.
- Add create form on `/crew/scheduling/periods`.
- Add edit/archive controls on `/crew/scheduling/periods/[periodId]`.
- Allow statuses `BID_OPEN`, `DRAFTING`, and `ARCHIVED`.
- Keep `PUBLISHED` deferred until a separate publish/finalize workflow.
- Set `archivedAt` when status becomes `ARCHIVED`; clear `archivedAt` if moved
  back to `BID_OPEN` or `DRAFTING`.
- Keep `createdById` and `publishedById` null until auth exists.

## Prompt 147 Target

- Add route-local server actions for create, update, and archive.
- Validate required `periodKey`, `name`, `startsAt`, `endsAt`, and status.
- Reject `endsAt <= startsAt`.
- Reject invalid bid windows when both dates exist and `bidCloseAt <= bidOpenAt`.
- Show readable errors through query params.
- Preserve existing read-only summaries and detail sections.
- Do not mutate `CrewSchedule`, `CrewScheduleEntry`, `CrewScheduleRequest`,
  `CrewRotationPattern`, `AircraftCrewAssignment`, or `CrewLegAssignment`.

## Prompt 148 QA Target

- Create a custom schedule period.
- Edit its name/date/bid-window/notes/status.
- Archive it.
- Confirm list and detail routes reflect the changes.
- Confirm no schedule entries, crew schedules, requests, patterns, aircraft
  assignments, or crew leg assignments are created or changed.

## Boundaries

- No schedule publishing.
- No schedule entry generation.
- No pattern application.
- No crew request review.
- No auth, crew portal, duty/rest enforcement, assignment automation, imports,
  provider integrations, or release behavior changes.

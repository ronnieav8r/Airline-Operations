# Crew Scheduling System Architecture

Last updated: 2026-06-09

## Summary

Crew Scheduling is a full internal module inside AeroOps. It should support
crew requests, flexible scheduling periods, reusable rotation patterns, draft
schedule building, published schedules, and downstream staffing visibility.

It is not a separate app, and it does not replace operational aircraft
assignment.

## Source-Of-Truth Boundary

Crew Scheduling answers:

```text
Who appears available, where, and under what schedule constraints?
```

Aircraft Crew Assignment answers:

```text
Who is actually assigned to this aircraft block?
```

The durable boundary remains:

- `CrewSchedule`: planned availability and duty status.
- Future schedule period records: containers for monthly, quarterly, or custom
  scheduling cycles.
- Future bid/request records: crew-submitted requests and preferences.
- Future pattern records: reusable rotations such as 7-on/7-off or 8-on/6-off.
- `AircraftCrewAssignment`: actual aircraft-block staffing decision.
- `CrewLegAssignment`: FlightLeg snapshot/evidence.

Published schedules may recommend or surface available crew for aircraft
staffing. They must not silently create, replace, or end aircraft assignments.

## Chosen Workflow

The first full scheduling architecture uses this lifecycle:

```text
BID_OPEN -> DRAFTING -> PUBLISHED -> ARCHIVED
```

- `BID_OPEN`: crew members can submit requests, preferences, and bid inputs for
  a schedule period.
- `DRAFTING`: admin/ops builds and adjusts the schedule using requests,
  staffing needs, qualifications, bases, locations, and company needs.
- `PUBLISHED`: finalized schedule is visible as crew availability context.
- `ARCHIVED`: period remains historical and should not be actively edited.

The first implementation path should be schema-first and additive. Do not
start with schedule writes until the period/request/pattern foundations exist.

## Schedule Periods

Schedule periods should be flexible:

- Monthly periods, such as January 2027.
- Quarterly periods, such as Q1 2027.
- Custom ranges, such as a training push, seasonal schedule, or transition
  period.

Future period records should support:

- Name or label.
- Start and end dates.
- Lifecycle status.
- Bid open/close windows.
- Draft/published metadata.
- Notes.

## Crew Bids And Requests

Crew requests should eventually support more than basic time off:

- Time off.
- Preferred work days.
- Preferred off days.
- Preferred rotation pattern.
- Schedule preference notes.
- Swap requests.
- General period-specific notes.

Current `TimeOffRequest` can remain useful for simple absence tracking, but it
does not cover the full bid/request workflow. The future architecture should
either extend request modeling additively or add a broader period-scoped
`CrewScheduleBid`/`CrewScheduleRequest` style model.

## Pattern Templates

Rotation pattern templates should be reusable admin-defined templates. Examples:

- 7 on / 7 off.
- 8 on / 6 off.
- Monday-Friday.
- Reserve block.
- Training block.
- Custom repeating cycle.

Patterns should feed draft schedules, not aircraft assignments. Applying a
pattern should create or suggest schedule rows inside a schedule period. It
should not create `AircraftCrewAssignment` rows.

## Draft And Published Schedules

The current `CrewSchedule` model can represent a single block, but it has no
period, publication, request, or pattern context.

Prompt 135 selected an additive schema foundation that keeps `CrewSchedule` in
place and adds richer schedule-building tables beside it. Future schema should
add:

- `CrewSchedulePeriod`.
- `CrewScheduleRequest`.
- `CrewRotationPattern`.
- `CrewRotationPatternDay`.
- `CrewScheduleEntry`.
- Lifecycle/request/entry status enums.
- Optional link from finalized schedule entries to generated `CrewSchedule`
  records.
- Publish/finalization metadata.

The first schema implementation must be additive. It should not replace
`CrewSchedule`, alter aircraft assignment behavior, or add schedule writes.

Prompt 136 implementation status: complete. The additive schema foundation now
exists with `CrewSchedulePeriod`, `CrewScheduleRequest`,
`CrewRotationPattern`, `CrewRotationPatternDay`, and `CrewScheduleEntry`.
Current planner reads still use existing `CrewSchedule`.

## Aircraft Assignment Integration

Published schedules should feed aircraft assignment by showing available and
suitable crew. They may later:

- Recommend crew for an aircraft block.
- Prefill an aircraft assignment form.
- Highlight conflicts and warnings.

They should not:

- Auto-create aircraft assignments.
- Replace existing aircraft assignments.
- End aircraft assignments silently.
- Treat `CrewSchedule` as proof of operational coverage.

## Positioning And Logistics Placeholder

Crew location and positioning are important but deferred. Future Crew Logistics
work should consider:

- Current crew location.
- Expected next location.
- Deadhead travel.
- Airline tickets.
- Hotel/travel needs.
- Repositioning alerts.

Prompt 134 does not implement this and should not add logistics schema.

## Deferred Work

- Auth and crew-member login behavior.
- Crew portal request submission UI.
- Schedule writes.
- Time-off review workflow.
- Duty/rest enforcement.
- Assignment automation.
- Crew positioning/logistics implementation.
- Provider integrations.
- Import execution.
- Hard release blocking.

## Next Recommended Chain

Use a schema-first chain:

```text
Prompt 135: Crew Scheduling Schema Foundation Planning
Prompt 136: Crew Scheduling Additive Schema Foundation
Prompt 137: Crew Scheduling Schema QA
Prompt 138: Schedule Period Read-Only Admin Surface Planning
Prompt 139: Schedule Period Read-Only Admin Surface Foundation
Prompt 140: Schedule Period Read-Only Admin Surface QA
```

Prompt 138 planning status: complete. The selected first admin surface is
read-only `/crew/scheduling/periods` plus `/crew/scheduling/periods/[periodId]`
for period context, requests, patterns, and schedule entries.

Prompt 139 implementation status: complete. The schedule period list and detail
routes now expose the additive scheduling foundation for admin review without
adding schedule writes, publishing actions, request review, or aircraft
assignment automation.

Prompt 140 QA status: complete. The schedule period admin surface renders
locally, planner navigation reaches it, crew detail links remain available, and
the implementation remains read-only.

Prompt 141 planning status: complete. The first time-off write workflow should
use existing `TimeOffRequest` rows for ops/admin request entry and review at
`/crew/scheduling/time-off`. It is intentionally separate from
`CrewScheduleRequest`, which remains the future period-scoped bid/preference
model. Approving time off must not write schedule rows or aircraft assignments.

Prompt 142 implementation status: complete. The first time-off workflow now
updates only `TimeOffRequest` and keeps conflict checks warning-only. Planner
and crew context pages continue to treat time off as availability context, not
coverage truth.

Prompt 152 planning status: complete. The first `CrewScheduleEntry` workflow
should create and maintain manual draft schedule entries inside schedule
periods. These entries are planning records only. They should not publish
schedules, generate `CrewSchedule` bridge rows, apply rotation patterns,
approve schedule requests, or mutate aircraft-block assignments.

## Prompt 182 Schedule Publish/Finalize Planning

Prompt 182 planning status: complete. The selected publish model marks a
schedule period and eligible schedule entries `PUBLISHED`, sets published
metadata, and creates or updates linked `CrewSchedule` bridge rows for current
planner compatibility.

Publishing remains planning/availability behavior only. It must not create,
replace, or end `AircraftCrewAssignment` rows, must not hard-enforce duty/rest,
and must not review crew requests or apply rotation patterns.

Prompt 183 implementation status: complete. Schedule periods can now be
published from the period detail page by admin/ops users. Publishing is
idempotent: eligible draft or already-published entries are marked
`PUBLISHED`, linked `CrewSchedule` bridge rows are created or updated, and the
period is marked `PUBLISHED`. Aircraft assignments remain unchanged.

Prompt 184 QA status: partial pass. Static validation passed for the publish
foundation. DB-backed idempotency, planner visibility, and no-assignment-mutation
workflow smoke remains pending because Docker Desktop was unavailable.

## Prompt 185 Rotation Pattern Application Planning

Prompt 185 planning status: complete. The selected pattern application model is
preview-first and draft-only. Applying a pattern should generate
`CrewScheduleEntry` rows with status `DRAFT`, linked to the selected
`CrewRotationPattern`, and should not publish entries, create `CrewSchedule`
bridge rows, review requests, or mutate aircraft assignments.

Prompt 186 implementation status: complete. Schedule period detail now has a
read-only, URL-driven pattern application preview. It calculates generated rows
from active pattern day rows and shows warning-only conflicts without writing
schedule entries or changing publish/assignment behavior.

Prompt 187 implementation status: complete. The preview panel now includes an
explicit generate-drafts action for admin/ops users. The action validates the
period, active crew member, active pattern, and date window; creates only
`DRAFT` `CrewScheduleEntry` rows; skips exact duplicates; and does not publish
or mutate aircraft assignments.

Prompt 188 QA status: partial pass. Static validation passed for pattern
preview and draft generation. DB-backed preview/generate workflow smoke remains
pending because Docker Desktop was unavailable.

## Prompt 189 Crew Schedule Request Workflow Planning

Prompt 189 planning status: complete. `CrewScheduleRequest` is the broader
period-scoped bid/preference/swap/note workflow and remains separate from
simple `TimeOffRequest` absence tracking. The first implementation should add
admin/ops approve/deny review for submitted requests only. Approved requests
become planning input; they must not automatically create schedule entries,
publish schedules, or mutate aircraft assignments.

Prompt 190 implementation status: complete. Schedule period request cards now
support admin/ops approve and deny review for submitted `CrewScheduleRequest`
rows. Review records status, timestamp, reviewer, and optional notes. Approval
does not create schedule entries, publish schedules, create bridge rows, or
mutate aircraft assignments.

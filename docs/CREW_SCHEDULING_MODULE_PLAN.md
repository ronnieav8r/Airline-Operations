# Crew Scheduling Module Plan

Last updated: 2026-06-09

## Summary

Crew Scheduling should be a crew availability and planning module. It should
help operations see who is available, unavailable, qualified, scheduled,
training, reserve, sick, or on time off before making aircraft-block staffing
decisions.

Crew Scheduling is not the active flight coverage source. Flight coverage
continues to come from `AircraftCrewAssignment`.

The broader architecture is now documented in
`docs/CREW_SCHEDULING_SYSTEM_ARCHITECTURE.md`. Crew Scheduling remains an
AeroOps module, not a separate app.

## Source-Of-Truth Boundary

The durable boundary is:

- `CrewSchedule`: planned crew availability, duty status, reserve, training,
  and station context.
- `TimeOffRequest`: requested or approved absence.
- Future duty/rest records: compliance history and limit calculations.
- `AircraftCrewAssignment`: operational aircraft-block staffing decision.
- `CrewLegAssignment`: FlightLeg snapshot/evidence of expected crew.

Crew Scheduling answers:

```text
Who appears available and suitable?
```

`AircraftCrewAssignment` answers:

```text
Who is actually assigned to this aircraft block?
```

Flights inherit crew from `AircraftCrewAssignment` at scheduled departure.

## Planning Policy

- Crew Scheduling may show availability, conflicts, warnings, and suggested
  staffing context.
- Crew Scheduling may later prefill aircraft-block assignment forms.
- Crew Scheduling must not silently create, replace, or end aircraft-block
  assignments.
- Actual staffing changes should remain explicit `AircraftCrewAssignment`
  actions under the aircraft crew workflow.
- Conflict checks remain warning-only until later compliance and release-policy
  slices approve stronger enforcement.

## Prompt 118 Read-Only Planner Target

The first implementation adds a read-only `/crew/scheduling` planner board.

Minimum display:

- Crew member identity, base, employment status, and duty status.
- Planned schedule blocks from `CrewSchedule`.
- Time-off context from `TimeOffRequest`.
- Current aircraft-block assignment from `AircraftCrewAssignment`.
- Upcoming FlightLeg coverage inherited from current aircraft-block
  assignments.
- Warning-only availability conflicts.
- Links to `/aircraft/[aircraftId]/crew` for actual assignment changes.

Prompt 118 implementation status: complete. The planner is read-only, uses
existing crew schedule, time-off, aircraft-block assignment, and coverage data,
and keeps all staffing changes under `/aircraft/[aircraftId]/crew`.

## Prompt 120 Availability Hints Target

The aircraft crew assignment workflow now surfaces read-only availability hints
near the create assignment form. These hints use existing schedule, time-off,
duty/employment, active assignment, and qualification context.

Prompt 120 implementation status: complete. Availability hints do not block
saves and do not replace `AircraftCrewAssignment` as the operational coverage
source.

## Prompt 122 Planner Filters

The crew scheduling planner now supports URL-driven filters for availability,
duty status, current assignment state, time-off overlap, base station, and
assigned aircraft.

Prompt 122 implementation status: complete. Filters are read-only and do not
change schedule, time-off, assignment, release, or coverage behavior.

Prompt 123 QA status: complete. Default and filtered planner URLs render
locally, and the filter controls remain read-only.

## Prompt 124 Planner Grouping

The crew scheduling planner now supports URL-driven grouping by availability,
base, current assignment state, or duty status. Grouping is applied after
active filters and does not change planner data sources or workflow behavior.

Prompt 124 implementation status: complete.
Prompt 125 QA status: complete. All grouping modes render locally and remain
read-only.

## Prompt 126 Cross-Link Polish

Crew and aircraft surfaces now include consistent shortcut links into the
read-only crew planner. Aircraft-specific pages use aircraft-filtered planner
URLs where practical.

Prompt 126 implementation status: complete. Links are navigation-only.
Prompt 127 QA status: complete. Cross-links render locally and route to the
expected planner and aircraft crew workflow surfaces.

## Prompt 128 Crew Member Context Page

The next crew usability slice adds a read-only `/crew/[crewMemberId]` context
page. This page should consolidate one crew member's roster identity,
availability, qualifications, schedule blocks, time off, current aircraft-block
assignments, and upcoming FlightLeg coverage.

Prompt 128 planning status: complete. Prompt 129 should implement the page and
cross-links without changing coverage truth or adding schedule/time-off writes.

Prompt 129 implementation status: complete. `/crew/[crewMemberId]` now shows
read-only crew identity, availability, qualifications, current aircraft-block
assignments, schedule, time off, and upcoming FlightLeg coverage context.
Prompt 130 QA status: complete. Crew detail routes and cross-links render
locally with no workflow behavior changes.

## Prompt 131 Planner Date/Window Controls

The next planner usability slice should add URL-driven planning window controls
to `/crew/scheduling`. The selected policy is `date=YYYY-MM-DD` plus
`days=1|3|7|14`, defaulting to today and 7 days. The selected window should
drive schedule blocks, time-off overlap, upcoming FlightLeg coverage, summary
counts, and warning-only availability messages.

Prompt 131 planning status: complete. Prompt 132 should implement the controls
without schema changes or schedule/time-off writes.
Prompt 132 implementation status: complete. `/crew/scheduling` now supports
URL-driven `date` and `days` controls while preserving filters, grouping, and
read-only planner behavior.
Prompt 133 QA status: complete. Default and query-param planner windows render
locally with filters, grouping, shortcuts, and crew detail links intact.

## Prompt 134 System Architecture

Crew Scheduling is now planned as a full internal scheduling module with
flexible schedule periods, first-class crew bids/requests, reusable rotation
patterns, and a `BID_OPEN -> DRAFTING -> PUBLISHED -> ARCHIVED` lifecycle.

Prompt 134 planning status: complete. The next safe chain is schema-first:
plan the additive scheduling schema before adding schedule-period UI or writes.

## Prompt 135 Schema Foundation Planning

The selected schema direction is additive. Keep existing `CrewSchedule` as the
current simple planner/availability row, and add richer future tables beside
it: `CrewSchedulePeriod`, `CrewScheduleRequest`, `CrewRotationPattern`,
`CrewRotationPatternDay`, and `CrewScheduleEntry`.

Prompt 135 planning status: complete. Prompt 136 should implement additive
schema only, with no UI, writes, publishing workflow, auth, duty/rest
enforcement, assignment automation, or positioning logistics.

Prompt 136 implementation status: complete. The additive schema foundation is
in place and local demo seed data creates a period, pattern, period request,
pattern day rows, and draft schedule entries.

Prompt 137 QA status: complete. Local migrate, seed, validation, build, health
counts, and route smoke passed for the additive schema foundation.

## Prompt 138 Schedule Period Admin Surface Planning

The first admin surface for the new schema foundation should be read-only. Use
`/crew/scheduling/periods` for period list/summary and
`/crew/scheduling/periods/[periodId]` for period detail.

Prompt 138 planning status: complete. Prompt 139 should implement read-only
pages only.

Prompt 139 implementation status: complete. The read-only schedule period list
and detail pages now expose the schema foundation without adding writes or
publishing actions.

Prompt 140 QA status: complete. Local validation, route smoke, and browser QA
confirmed the read-only schedule period admin surface and unchanged planner
behavior.

## Prompt 141 Time-Off Request Workflow Planning

The first time-off workflow should use the existing `TimeOffRequest` table
directly. It should live at `/crew/scheduling/time-off`, serve ops/admin users
only until auth exists, and support create plus review actions for approve,
deny, and cancel.

Prompt 141 planning status: complete. Prompt 142 should implement the
ops/admin `TimeOffRequest` workflow without schema changes, crew self-service,
schedule writes, assignment automation, duty/rest enforcement, or release
behavior changes.

Prompt 142 implementation status: complete. `/crew/scheduling/time-off` now
supports ops/admin `TimeOffRequest` creation and review with warning-only
conflict visibility and no schedule or assignment side effects.

Prompt 143 QA status: complete. Local workflow QA confirmed create, approve,
deny, and cancel behavior, reviewed timestamps, route smoke, and no schedule or
assignment side effects.

Prompt 144 implementation status: complete. `/crew/scheduling/time-off` now
supports URL-driven queue filters for status, crew member, request type, and
date window while preserving create/review actions.

Prompt 145 QA status: complete. Filter routes, combined filters, filtered
create/review return behavior, route smoke, validation, and no side-effect
checks passed.

## Prompt 146 Schedule Period Create/Edit Planning

The first `CrewSchedulePeriod` write workflow should let ops/admin users create,
edit, and archive scheduling periods without publishing schedules or generating
schedule entries.

Prompt 146 planning status: complete. Prompt 147 should implement create,
edit, and archive controls on the existing schedule-period admin routes.

Prompt 147 implementation status: complete. Schedule periods can now be created,
edited, and archived from the existing admin routes without publishing schedules
or generating schedule entries.

Prompt 148 QA status: partial pass. Prisma validation, typecheck, lint, and
build passed. Local workflow/browser QA is pending because Docker Desktop was
not running in the session.

## Prompt 182 Schedule Publish/Finalize Planning

The selected publish model keeps `CrewScheduleEntry` as the richer scheduling
record and uses `CrewSchedule` as the compatibility bridge. Publishing a period
should mark eligible entries and the period as `PUBLISHED`, set published
metadata, and create/update one linked `CrewSchedule` row per published entry.

Publishing does not mutate aircraft assignments, does not hard-enforce
duty/rest, and does not review crew requests.

## Prompt 149 Rotation Pattern Admin Planning

Rotation pattern admin should manage reusable template headers and ordered day
rows using existing `CrewRotationPattern` and `CrewRotationPatternDay` tables.
Applying patterns to schedule entries remains deferred.

Prompt 149 planning status: complete. Prompt 150 should implement pattern
header create/edit, active toggles, and day-row add/update/delete.

Prompt 150 implementation status: complete. `/crew/scheduling/patterns` now
supports rotation pattern header admin, active toggles, and ordered day-row
administration without applying patterns to schedules.

Prompt 151 QA status: partial pass. Prisma validation, typecheck, lint, and
build passed. The build includes `/crew/scheduling/patterns`. Local
workflow/browser QA is pending because Docker Desktop was not running in the
session.

## Prompt 152 Crew Schedule Entry Planning

The first `CrewScheduleEntry` workflow should be manual draft-entry management
inside an existing schedule period. It should let ops/admin users create, edit,
and cancel `DRAFT` entries as planning records only.

Prompt 152 planning status: complete. Prompt 153 should implement draft
schedule-entry create/edit/cancel controls on
`/crew/scheduling/periods/[periodId]` without publishing schedules, generating
legacy `CrewSchedule` rows, applying rotation patterns, approving requests, or
mutating aircraft assignments.

Schedule-entry conflicts remain warning-only. Overlapping entries, approved or
pending time off, existing simple schedule blocks, aircraft-block assignments,
and qualification issues may be shown to the user, but they should not block
valid draft-entry saves in this first workflow.

Prompt 153 implementation status: complete. Schedule-period detail pages now
support manual draft `CrewScheduleEntry` create/edit/cancel, readable duplicate
errors, and warning-only conflict context while preserving the boundary that
schedule entries are planning records only.

Prompt 154 QA status: partial pass. Prisma validation, typecheck, lint, and
build passed. Local DB-backed workflow/browser QA is pending because Docker
Desktop was not running in the session.

Prompt 155 implementation status: complete. `/crew/scheduling` now surfaces
draft and published `CrewScheduleEntry` rows as read-only planning context
beside existing `CrewSchedule` blocks. Aircraft-block assignments remain the
operational coverage source.

Prompt 156 QA status: partial pass. Prisma validation, typecheck, lint, and
build passed. Local DB-backed route/browser QA is pending because Docker
Desktop was not running in the session.

Prompt 157 implementation status: complete. `/crew/[crewMemberId]` now shows
draft and published `CrewScheduleEntry` rows as read-only individual schedule
context beside existing schedule blocks, time off, qualifications, assignments,
and upcoming FlightLeg coverage.

Prompt 158 QA status: partial pass. Prisma validation, typecheck, lint, and
build passed. Local DB-backed route/browser QA is pending because Docker
Desktop was not running in the session.

Warning-only conflict examples:

- No schedule found for the planning day/window.
- Approved or pending time-off overlaps the planning window.
- Crew member is sick, vacation, training, or otherwise not clearly available.
- Missing or expired qualification for an aircraft type or seat role.
- Aircraft-block coverage gap exists for CPT or FO.

## Deferred Work

- Crew schedule publish/finalize workflow.
- Crew self-service time-off request workflow.
- Schedule period publish workflow.
- Crew bid/request create/review workflow.
- Rotation pattern apply workflow.
- Duty/rest legal enforcement.
- Schedule import/apply workflow.
- Pairing/trip construction.
- Automated assignment recommendations.
- Silent application of aircraft-block assignment changes.
- Auth, signatures, and hard release blocking.

## Non-Goals

- Do not replace `AircraftCrewAssignment` as coverage truth.
- Do not treat `CrewSchedule` as proof that a crew member is assigned to an
  aircraft.
- Do not treat `CrewLegAssignment` as live staffing truth.
- Do not add schema for Prompt 118 unless a separate planning slice approves
  it.

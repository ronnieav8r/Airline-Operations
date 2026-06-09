# Prompt 134: Crew Scheduling System Architecture Planning

## Summary

Plan Crew Scheduling as a full internal scheduling module inside AeroOps, not a
separate app. The chosen architecture is flexible schedule periods, a full crew
bid/request workflow, reusable rotation pattern templates, and a
`Bid -> Draft -> Published` lifecycle.

Prompt 134 is docs/planning only. Do not add schema, UI, mutations, auth,
assignment automation, duty/rest enforcement, imports, provider integrations,
or positioning logistics implementation.

## Key Decisions

- Crew Scheduling answers: who appears available, where, and under what
  schedule constraints.
- Aircraft Crew Assignment answers: who is actually assigned to an aircraft
  block.
- Schedule periods are flexible and can represent monthly, quarterly, or custom
  ranges.
- Crew bids/requests are first-class and should eventually include time off,
  preferred work/off patterns, schedule preferences, swaps, and general notes.
- Rotation templates should support patterns such as 7-on/7-off, 8-on/6-off,
  reserve blocks, training blocks, and custom repeating cycles.
- Schedule lifecycle is `BID_OPEN -> DRAFTING -> PUBLISHED -> ARCHIVED`.
- Published schedules feed aircraft staffing as recommendations/availability
  only.
- Crew positioning/logistics is important but remains a planned placeholder.

## Current Schema Support And Gaps

- Existing `CrewSchedule` can represent individual schedule blocks, but it has
  no period, draft/published state, bid linkage, pattern source, or
  finalization workflow.
- Existing `TimeOffRequest` supports basic time-off requests, but does not
  cover broader bidding, schedule preferences, pattern requests, swaps, or
  period-scoped bid windows.
- Existing `AircraftCrewAssignment` remains the explicit aircraft staffing
  record and should not be replaced by published schedules.
- Existing `CrewLegAssignment` remains FlightLeg snapshot/evidence, not live
  scheduling truth.

## Recommended Next Slices

- Prompt 135: Crew Scheduling Schema Foundation Planning.
- Prompt 136: Crew Scheduling Additive Schema Foundation.
- Prompt 137: Crew Scheduling Schema QA.
- Prompt 138: Schedule Period Read-Only Admin Surface Planning.
- Prompt 139: Schedule Period Read-Only Admin Surface Foundation.
- Prompt 140: Schedule Period Read-Only Admin Surface QA.

## Assumptions

- Crew Scheduling remains an AeroOps module, not a separate app.
- Crew member login/request behavior remains deferred until auth and user
  workflow planning.
- Admin/ops users will eventually create draft schedules, apply patterns,
  review requests, and publish schedules.
- Published schedules recommend availability only and do not auto-create
  `AircraftCrewAssignment` rows.
- Positioning/logistics should become a later Crew Logistics module.

# Prompt 136: Crew Scheduling Additive Schema Foundation

## Summary

Implement the additive crew scheduling schema foundation planned in Prompt
135. Keep existing `CrewSchedule` and all current planner reads intact.

## Key Changes

- Add additive Prisma enums for schedule period lifecycle, request type,
  request status, and schedule entry status.
- Add new Prisma models:
  - `CrewSchedulePeriod`
  - `CrewScheduleRequest`
  - `CrewRotationPattern`
  - `CrewRotationPatternDay`
  - `CrewScheduleEntry`
- Add relation arrays to `CrewMember`, `Station`, `User`, and `CrewSchedule`
  where needed.
- Add local seed demo data for one schedule period, one 7-on/7-off pattern,
  pattern day rows, one period-scoped request, and draft schedule entries.
- Add `/api/health` counts for the new scheduling tables.

## Boundaries

- No UI was added.
- No schedule write workflow was added.
- No schedule publishing action was added.
- No crew portal/auth behavior was added.
- No duty/rest enforcement, assignment automation, positioning logistics,
  imports, or provider integrations were added.
- Published schedules remain recommendation/availability context only.

## Status

Implemented. Prompt 137 should validate schema, migration, seed, health counts,
and unchanged current routes.

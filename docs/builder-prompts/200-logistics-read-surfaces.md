# Prompt 200: Logistics Read Surfaces

## Summary

Expose Crew Logistics as read-only planning context on existing crew and
aircraft staffing surfaces. This slice makes the Prompt 199 storage visible
without adding logistics create/edit workflows, provider integrations, booking,
expenses, assignment automation, schedule mutation, or duty/rest enforcement.

## Scope

- Show recent crew location records and open logistics needs on
  `/crew/[crewMemberId]`.
- Show latest crew location and open logistics needs on `/crew/scheduling`
  crew cards and summary counts.
- Show crew logistics context on `/aircraft/[aircraftId]/crew`, including
  crew-option hints and aircraft-linked open logistics needs.
- Keep all logistics information warning/planning-only.

## Boundaries

- No logistics create/edit UI.
- No booking, hotel, airline ticket, or expense integration.
- No `CrewSchedule`, `CrewScheduleEntry`, `AircraftCrewAssignment`,
  `CrewLegAssignment`, release, or duty/rest mutations.
- No crew self-service logistics creation.

## Test Plan

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Smoke-check `/crew/[crewMemberId]`, `/crew/scheduling`, and
  `/aircraft/[aircraftId]/crew` when Docker/runtime is available.

## Follow-Up

Prompt 201 should plan and implement ops/admin logistics create/edit workflows
if the read surfaces are acceptable.

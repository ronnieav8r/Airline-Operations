# Prompt 209: Crew Logistics Depth Planning

## Summary

Plan the next Crew Logistics depth slice. The chosen direction is a central
ops/admin logistics workbench before provider integrations. Existing
crew-scoped logistics create/edit remains at `/crew/[crewMemberId]/logistics`;
the next implementation should add a read-only coordination surface at
`/crew/logistics`.

Prompt 209 is docs/planning only. Prompt 210 should implement the workbench.

## Key Decisions

- Keep `CrewLocationRecord` as the crew location context record.
- Keep `CrewLogisticsNeed` as the travel-support need record for positioning,
  deadhead, airline ticket, hotel, ground transport, and other needs.
- Do not add schema in Prompt 210.
- Do not add provider integrations, booking automation, ticket purchase,
  hotel booking, expense workflow, file upload, or payment handling.
- Do not mutate schedules, aircraft assignments, FlightLeg release behavior,
  duty/rest records, or crew portal behavior.
- Keep ops/admin create/edit on the crew-scoped page.
- Make `/crew/logistics` a central workbench for scanning, filtering, and
  routing to existing edit workflows.

## Prompt 210 Target

- Add `/crew/logistics` for `ADMIN` and `OPS`.
- Show summary cards for open needs, requested needs, booked needs, overdue
  needs, missing provider/confirmation details, and crews without current
  location context.
- Add URL-driven filters for status, need type, aircraft, from station, to
  station, and crew member.
- Add grouping by `status`, `needType`, `aircraft`, or `neededBy`.
- Show logistics cards with crew member, current/latest location, need type,
  status, needed-by time, route/stations, linked aircraft, linked FlightLeg,
  provider, confirmation number, and notes excerpt.
- Include direct links to crew detail, crew logistics management, aircraft
  context, aircraft crew workflow, and FlightLeg detail when IDs exist.
- Add empty states and reset-filter links.
- Add global navigation/cross-links from `/crew`, `/crew/scheduling`, and the
  app shell if consistent with existing navigation.

## Follow-On Slices

- Prompt 211: Crew Logistics Workbench QA.
- Prompt 212: Crew Logistics Provider Integration Planning.
- Prompt 213: Crew Logistics Provider Placeholder Settings Planning.
- Prompt 214: Crew Logistics Provider Placeholder Settings Foundation, only if
  Prompt 212 decides a settings foundation is useful before live integration.

Provider integration planning should define airline ticket, hotel, and ground
transport boundaries, but live provider calls should remain deferred until
workflow shape and required vendors are known.

## Test Plan For Prompt 210

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Smoke `/crew/logistics`, `/crew`, `/crew/scheduling`,
  `/crew/[crewMemberId]/logistics`, `/aircraft`, `/aircraft/[aircraftId]/crew`,
  `/operations-control`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.
- Verify `ADMIN` and `OPS` can open `/crew/logistics`.
- Verify non-ops roles cannot open `/crew/logistics`.
- Verify filters, grouping, empty states, and cross-links work.
- Confirm no schedule, assignment, release, duty/rest, provider, booking, or
  expense data is mutated by the workbench.

## Assumptions

- Central visibility is the next highest-value logistics improvement.
- Provider integrations should be planned after the workbench, not implemented
  first.
- Current logistics schema is sufficient for the first workbench.
- Crew self-service logistics creation remains deferred.

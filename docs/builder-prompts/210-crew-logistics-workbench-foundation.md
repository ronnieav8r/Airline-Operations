# Prompt 210: Crew Logistics Workbench Foundation

## Summary

Add a central ops/admin logistics workbench at `/crew/logistics`. This is a
read-only coordination surface over existing `CrewLocationRecord` and
`CrewLogisticsNeed` data. It does not add schema, provider integrations,
booking automation, expenses, schedule mutations, aircraft assignment
automation, duty/rest enforcement, or release behavior changes.

## Implemented Scope

- Added `/crew/logistics` for `ADMIN` and `OPS`.
- Added summary cards for open needs, requested needs, booked needs, overdue
  needs, missing provider/confirmation details, and active crew without current
  location context.
- Added URL-driven filters for status, need type, crew member, aircraft, from
  station, and to station.
- Added grouping by status, need type, aircraft, and needed-by window.
- Added logistics cards with crew member, latest location, need type/status,
  needed-by time, station route, linked aircraft, linked FlightLeg, provider,
  confirmation, notes, and context links.
- Added links from `/crew` and `/crew/scheduling` to the workbench.
- Kept create/edit actions on `/crew/[crewMemberId]/logistics`.

## Boundaries

- No new schema.
- No provider integrations or live booking.
- No expense/payment workflow.
- No file uploads or itinerary attachments.
- No crew self-service logistics writes.
- No automatic positioning recommendations.
- No schedule, aircraft assignment, FlightLeg release, or duty/rest mutation.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `npm run smoke:app`
- `npm run smoke:browser`

Runtime smoke includes `/crew/logistics` for `ADMIN` and `OPS`, and verifies
non-ops roles are redirected away from the workbench.

## Next Recommended Slice

Prompt 211 should QA the logistics workbench and document results. Provider
integration planning should remain a separate later slice.

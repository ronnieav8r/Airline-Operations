# Prompt 110: Aircraft Context Navigation Planning

## Summary

Plan a read-only aircraft context navigation upgrade using Fleet + Detail.

Keep `/aircraft` as the fleet board, add `/aircraft/[aircraftId]` as a
dedicated aircraft operational context page, and preserve
`/aircraft/[aircraftId]/airworthiness` for existing aircraft-level
airworthiness writes.

## Key Decisions

- Prompt 110 is docs/planning only.
- Prompt 111 should implement the aircraft detail route with no schema changes.
- `/aircraft` remains the fleet scan page.
- Each aircraft card should link to the new aircraft context detail page.
- `/aircraft/[aircraftId]/airworthiness` remains the only aircraft
  airworthiness write surface.
- Keep release behavior warning-only.
- Do not add auth, hard release blocking, imports, provider integrations, file
  uploads, AI behavior, or new release policy.

## Prompt 111 Target

- Add `app/aircraft/[aircraftId]/page.tsx`.
- Add a focused aircraft-context query helper, reusing current aircraft board
  logic where practical but avoiding a full fleet query for one aircraft.
- Update `/aircraft` cards with a primary Aircraft Context link plus the
  existing airworthiness link.
- Group the aircraft detail page into visible sections:
  - Overview.
  - Current Assignment.
  - Upcoming Legs.
  - Airworthiness.
  - Crew Coverage.
  - Alerts.
  - Operations Links.
- For FlightLeg-backed upcoming legs, include links to Operations Control
  detail, edit, Manifest, W&B, Locating, and Dispatch.
- If no aircraft is found, return the existing Next.js not-found behavior.
- If an aircraft has no upcoming legs, crew block, airworthiness release,
  discrepancies, or deferrals, show readable empty states.

## Detail Page Content

The aircraft context page should show:

- Aircraft identity, status, home station, configuration, and capabilities.
- Current or next operational assignment, if one exists.
- Upcoming legs assigned to the aircraft.
- Current crew assignment block and CPT/FO coverage state.
- Current aircraft maintenance airworthiness release and expiration.
- Latest maintenance event.
- Open discrepancies.
- Active deferrals.
- Active aircraft alerts.
- Links back to `/aircraft`, `/operations-control`, and relevant FlightLeg
  workflows.

## Prompt 112 QA Target

- Confirm `/aircraft` still renders the fleet board.
- Confirm `/aircraft` links into aircraft detail pages.
- Confirm `/aircraft/[aircraftId]` renders for aircraft with complete and
  partial context.
- Confirm `/aircraft/[aircraftId]/airworthiness` still works.
- Confirm Operations Control links from aircraft detail route correctly.
- Confirm no workflow behavior changed and no new mutations were added.

## Test Plan

Prompt 110 is docs/planning only.

For Prompt 111 and Prompt 112:

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/aircraft`.
- Smoke-check one `/aircraft/[aircraftId]`.
- Smoke-check `/aircraft/[aircraftId]/airworthiness`.
- Smoke-check `/operations-control`.
- Smoke-check one `/operations-control/[flightLegId]`.
- Smoke-check `/`, `/flights`, `/crew`, `/scheduling`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`.
- Browser-check `/aircraft` and one aircraft detail page for context sections,
  empty states, airworthiness link, and Operations Control workflow links.

## Assumptions

- This is a UI/read-only navigation slice.
- `/aircraft` remains a fleet board rather than becoming a single-aircraft page.
- `/aircraft/[aircraftId]` is the new aircraft operational context route.
- Existing airworthiness create/edit remains only under
  `/aircraft/[aircraftId]/airworthiness`.
- Legacy import work remains deferred.

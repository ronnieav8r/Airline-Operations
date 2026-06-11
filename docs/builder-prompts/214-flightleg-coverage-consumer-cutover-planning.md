# Prompt 214: FlightLeg Coverage Consumer Cutover Planning

## Summary

Plan the next controlled FlightLeg cutover step after Prompt 213. This is a
planning-only slice. No app code, schema, API routes, or response shapes should
change in Prompt 214.

## Current State

Prompt 213 added FlightLeg-primary aliases to the crew and coverage responses:

- `operationalFlightLegId`
- `legacyFlightId`
- `inputId`
- `identitySource`

The compatibility API paths remain:

- `/api/flights/[id]/crew`
- `/api/flights/[id]/coverage`

Both paths accept either a `FlightLeg.id` or a legacy `Flight.id`.

## Current Consumer Inventory

These callers already prefer a FlightLeg ID where available:

- `lib/dashboard-queries.ts`
- `lib/flight-queries.ts`

These callers still pass legacy `Flight.id` or legacy-only IDs and are the next
safe cutover candidates:

- `app/crew/page.tsx`
- `lib/crew-member-context-queries.ts`
- `lib/crew-scheduling-planner-queries.ts`
- `lib/time-off-workflow-queries.ts`
- `lib/scheduling-queries.ts`
- `lib/flightleg-parity.ts`
- `scripts/backfill-flightleg-demo.ts`

API route compatibility callers remain intentionally unchanged:

- `app/api/flights/[id]/crew/route.ts`
- `app/api/flights/[id]/coverage/route.ts`

## Prompt 216 Target

Implement an additive internal-consumer cutover:

- Prefer `FlightLeg.id` when a visible/read-model row has a bridged FlightLeg.
- Preserve legacy `Flight.id` fallback for unbridged legacy rows.
- Preserve all existing page output and route behavior.
- Preserve `/api/flights/[id]/crew` and `/api/flights/[id]/coverage`.
- Preserve current response fields, including legacy `flightId`.
- Keep aircraft-block assignment as the active coverage source.

Suggested first implementation scope:

- Update crew-heavy read helpers to normalize each row with:
  - `flightLegId` when present,
  - `legacyFlightId` for compatibility/archive,
  - `coverageLookupId = flightLegId ?? legacyFlightId`.
- Migrate `app/crew/page.tsx`, `lib/crew-member-context-queries.ts`,
  `lib/crew-scheduling-planner-queries.ts`, `lib/time-off-workflow-queries.ts`,
  and `lib/scheduling-queries.ts` to call `resolveFlightCoverage` with
  `coverageLookupId`.
- Leave `lib/flightleg-parity.ts` and `scripts/backfill-flightleg-demo.ts`
  legacy-oriented because they intentionally compare or create bridge records.

## Stop Conditions

Stop and plan separately if the implementation would require:

- Changing public API paths.
- Removing or renaming response fields.
- Reinterpreting `flightId` to mean `FlightLeg.id`.
- Dropping or renaming `Flight`.
- Removing `FlightPassenger`, `CrewFlightLog`, `OperationalControlRecord.flightId`,
  or `FlightLeg.legacyFlightId`.
- Replacing `AircraftCrewAssignment` as operational staffing truth.
- Adding schema or migrations.

## Test Plan For Prompt 216

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `npm run smoke:app`
- `npm run smoke:browser`
- Targeted smoke for:
  - `/crew`
  - one `/crew/[crewMemberId]`
  - `/crew/scheduling`
  - `/crew/scheduling/time-off`
  - `/scheduling`
  - `/api/flights/{flightLegId}/coverage`
  - `/api/flights/{legacyFlightId}/coverage`
  - `/internal/flightleg-parity`
  - `/internal/flightleg-write-readiness`

## Assumptions

- Prompt 214 is planning-only.
- Prompt 216 should be additive and internal-consumer-focused.
- Legacy `Flight` remains compatibility/archive.
- API compatibility is preserved until a later versioned API transition is
  explicitly planned.

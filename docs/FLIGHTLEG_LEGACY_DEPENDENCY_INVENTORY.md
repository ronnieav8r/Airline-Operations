# FlightLeg Legacy Dependency Inventory

Last updated: 2026-06-11

## Summary

Prompt 221 inventories remaining legacy `Flight` dependencies after the
FlightLeg read/API/consumer cutover work. `FlightLeg` is the MVP operational
identity, but legacy `Flight` remains compatibility/archive and must not be
removed in this backend-MVP chain.

## Cutover-Ready Internal Consumers

These areas still query legacy `Flight` first and should be considered for
Prompt 222 FlightLeg-primary read rewiring:

- Main crew roster upcoming-flight context in `app/crew/page.tsx`.
- Crew member context upcoming-flight context in
  `lib/crew-member-context-queries.ts`.
- Crew scheduling planner upcoming-flight context in
  `lib/crew-scheduling-planner-queries.ts`.
- Time-off conflict warnings in `lib/time-off-workflow-queries.ts`.
- Scheduling board base query in `lib/scheduling-queries.ts`.

Cutover rule:

- Query `FlightLeg`/`AircraftAssignment` first where an aircraft bridge exists.
- Preserve explicit legacy `Flight` fallback for unbridged rows.
- Preserve compatibility IDs and route behavior until a separate UI/API
  contract cleanup is planned.

## Compatibility-Required Dependencies

These should remain legacy-aware for MVP:

- `app/operations-control/actions.ts` creates and updates a legacy `Flight`
  bridge in the same transaction as `FlightLeg`.
- `OperationalControlRecord.flightId` remains populated for compatibility.
- `/api/flights/[id]/crew` and `/api/flights/[id]/coverage` remain public
  compatibility paths accepting both FlightLeg IDs and legacy Flight IDs.
- `lib/crew-resolution.ts` must keep direct legacy `Flight` fallback for
  unbridged records.
- `scripts/smoke-app.ts` validates both FlightLeg ID and legacy Flight ID API
  behavior.
- `scripts/smoke-workflows.ts` validates FlightLeg/legacy bridge write parity.

## Archive/Diagnostic Dependencies

These should stay legacy-aware because they intentionally compare, backfill, or
preserve old records:

- `prisma/seed.ts`.
- `scripts/backfill-authority-demo.ts`.
- `scripts/backfill-flightleg-demo.ts`.
- `scripts/backfill-release-evidence-demo.ts`.
- `lib/flightleg-parity.ts`.
- `lib/flightleg-write-readiness.ts`.
- `FlightPassenger` and `CrewFlightLog` archive/history tables.
- `Alert.flightId` compatibility context.

## Prompt 222 Target

Implement only the cutover-ready internal consumer changes. Do not remove
legacy models, response fields, API paths, bridge writes, seed/backfill logic,
parity diagnostics, or archive tables.

Prompt 222 implementation status: complete. The remaining cutover-ready
internal consumers now prefer FlightLeg-primary reads, with explicit legacy
fallback retained for unbridged rows.

## Stop Conditions

- A consumer requires reinterpreting `flightId` as `FlightLeg.id`.
- A consumer requires removing legacy fallback rows.
- A consumer requires changing public API paths or response shape.
- A consumer needs `FlightPassenger` or `CrewFlightLog` migration semantics.

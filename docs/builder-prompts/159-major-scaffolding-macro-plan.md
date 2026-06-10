# Prompt 159: Major Scaffolding Macro Plan

## Summary

Create the durable macro roadmap for the remaining major AeroOps scaffolding:
auth/roles, controlled FlightLeg cutover, ReleasePackage, crew compliance,
crew scheduling lifecycle, crew self-service, and crew logistics.

## Decisions Captured

- Single-customer deployments with separate databases per customer/operator
  group.
- Local email/password auth with HttpOnly DB-backed sessions.
- Expanded operational roles.
- Controlled FlightLeg cutover.
- Additive ReleasePackage wrapper around existing `FlightRelease`.
- Crew schedule publishing creates linked `CrewSchedule` bridge rows.
- Rotation patterns generate draft entries only.
- `CrewScheduleRequest` handles broader period-scoped bids/preferences/swaps.
- `TimeOffRequest` remains simple absence workflow.
- Full separate crew compliance record types.
- Crew self-service view plus request submission first.
- Crew logistics location plus travel needs first.
- Warning-first enforcement until auth/signatures/policy mature.

## Deliverables

- Add `docs/MAJOR_SCAFFOLDING_MACRO_PLAN.md`.
- Update `docs/PROJECT_STATUS.md`.
- Update `docs/SCHEMA_DECISIONS.md`.

## Prompt 160 Target

Plan local auth in detail:

- Role definitions and route/action access rules.
- Password/session policy.
- Current-user helper and server action guard policy.
- User attribution policy for existing nullable user fields.
- Seed/demo credential policy.

## Boundaries

- No app code.
- No schema changes.
- No auth implementation.
- No FlightLeg cutover code.
- No ReleasePackage code.
- No crew compliance, scheduling lifecycle, portal, or logistics code.

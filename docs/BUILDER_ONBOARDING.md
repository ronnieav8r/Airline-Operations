# AeroOps Builder Onboarding

Last updated: 2026-06-13

## Current App State

AeroOps Center is now an active Next.js, TypeScript, Prisma, and PostgreSQL app
for small airline, charter, and air taxi operations. It is no longer just a
planning-doc repository.

Core surfaces:

- `/`: dashboard and attention surface.
- `/operations-control`: FlightLeg workbench.
- `/operations-control/[flightLegId]`: FlightLeg detail, release readiness,
  release evidence, ReleasePackage preview/final capture, and audit context.
- `/aircraft`: fleet board.
- `/aircraft/[aircraftId]`: aircraft operational context.
- `/aircraft/[aircraftId]/crew`: aircraft-block crew assignment workflow.
- `/aircraft/[aircraftId]/airworthiness`: aircraft airworthiness workflow.
- `/aircraft/[aircraftId]/fuel`: aircraft fuel ledger.
- `/admin/settings`: admin settings, currently operator Jet A density.
- `/operations-control/[flightLegId]/fuel`: FlightLeg release/postflight fuel.
- `/crew`: crew roster.
- `/crew/[crewMemberId]`: crew member context.
- `/crew/[crewMemberId]/compliance`: ops/admin crew compliance management.
- `/crew/[crewMemberId]/logistics`: ops/admin crew logistics management.
- `/crew/portal`: linked crew-user self-service portal.
- `/crew/scheduling`: crew availability planner.
- `/crew/scheduling/periods`: schedule period admin.
- `/crew/scheduling/patterns`: rotation pattern admin.
- `/crew/scheduling/time-off`: ops/admin time-off workflow.

## Current Data Boundaries

- `FlightLeg` is the long-term operational anchor.
- Legacy `Flight` remains for compatibility/archive behavior until parity is
  proven and destructive removal is separately planned.
- `FlightRelease` remains the release decision record.
- `ReleasePackage` is an additive evidence bundle around `FlightRelease`;
  preview and final package capture are active, but it does not replace release
  decisions.
- `AircraftCrewAssignment` remains operational coverage truth.
- `CrewLegAssignment` remains FlightLeg snapshot/evidence.
- `CrewScheduleEntry` and `CrewSchedule` describe planning/availability, not
  aircraft staffing.
- Crew Scheduling supports periods, requests, rotation patterns, draft entries,
  publishing, and bridge rows, but it does not silently create aircraft
  assignments.
- Crew Logistics tracks location and travel-support needs only. It does not
  book travel, create expenses, or automate positioning.
- Crew Compliance tracks certificates, medicals, training, checks, recency,
  duty, and rest as admin-managed evidence and warning inputs only.
- Fuel is aircraft state first and FlightLeg release evidence second. Pounds
  are source-of-truth; approximate gallons use the operator Jet A density saved
  on each fuel event.

## Auth And Roles

Local app auth is in place with DB-backed sessions and roles:

- `ADMIN`
- `OPS`
- `DISPATCH`
- `MAINTENANCE`
- `CREW`
- `SAFETY`
- `VIEWER`

Mutation workflows should use role gates. Crew portal behavior is scoped to the
linked `CrewMember.userId`.

## Warning-First Policy

The app remains warning-first for operational readiness. Do not add hard release
blocking, legal signature semantics, duty/rest hard enforcement, booking
integrations, provider-backed checks, or destructive legacy removal without a
separate planning slice.

## Validation Status

Latest backend MVP QA passed:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local DB prep and seed,
- focused backend workflow smokes,
- role/route smoke,
- browser smoke.

Command-driven role smoke testing is available through
`docs/SMOKE_TESTING.md`. The harness creates gated smoke users for every role
and checks app routes with real DB-backed session cookies.

The concise backend-MVP state is in `docs/BACKEND_MVP_STATE.md`. The final
smoke QA is in `docs/BACKEND_MVP_FINAL_SMOKE_QA.md`, and remaining post-MVP
gaps are in `docs/BACKEND_MVP_GAP_REVIEW.md`.

## Required Reading Before New Work

- `docs/README.md`
- `docs/CURRENT_HANDOFF.md`
- `docs/PROJECT_STATUS.md`
- `docs/BACKEND_MVP_STATE.md`
- `docs/SCHEMA_DECISIONS.md`
- `docs/MAJOR_SCAFFOLDING_MACRO_PLAN.md`
- `docs/BACKEND_MVP_COMPLETION_PLAN.md`
- `docs/MACRO_SCAFFOLDING_QA_LOG.md`
- `docs/SMOKE_TESTING.md`
- `docs/DOCUMENTATION_AUDIT.md`
- Relevant domain doc for the slice, such as:
  - `docs/CREW_SCHEDULING_SYSTEM_ARCHITECTURE.md`
  - `docs/CREW_COMPLIANCE_PLAN.md`
  - `docs/CREW_LOGISTICS_PLAN.md`
  - `docs/RELEASEPACKAGE_PLAN.md`
  - `docs/FLIGHTLEG_CUTOVER_PLAN.md`
  - `docs/FUEL_LEDGER_RELEASE_READINESS.md`

## Next Safe Planning Choices

The active priority is frontend/UI polish. Choose one narrow slice at a time,
and preserve the backend contracts documented in `docs/BACKEND_MVP_STATE.md`.

- Frontend information architecture cleanup.
- UI polish for dashboard, Operations Control, aircraft, crew, scheduling,
  release evidence, compliance, and logistics.
- Backend follow-ups only when they are explicit post-MVP decisions.

Avoid broad multi-feature implementation without a fresh plan.

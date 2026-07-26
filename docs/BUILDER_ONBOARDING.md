# AeroOps Builder Onboarding

Last updated: 2026-06-30

## Current App State

AeroOps Center is now an active Next.js, TypeScript, Prisma, and PostgreSQL app
for small airline, charter, and air taxi operations. It is no longer just a
planning-doc repository.

Core surfaces:

- `/`: dashboard and attention surface.
- `/operations-control`: FlightLeg workbench.
- `/operations-control/[flightLegId]`: FlightLeg detail, release readiness,
  release evidence, ReleasePackage preview/final capture, and audit context.
- `/operations-control/[flightLegId]/manifest`: passenger-first manifest
  workflow backed by reusable passenger records.
- `/operations-control/[flightLegId]/fuel`: FlightLeg release/postflight fuel.
- `/customers`: customer and passenger records, including customer/passenger
  linking.
- `/aircraft`: compact aircraft fleet/status board with aircraft quick-review
  drawers.
- `/aircraft?view=crew-coverage`: aircraft crew coverage planner.
- `/aircraft/[aircraftId]`: aircraft operational context.
- `/aircraft/[aircraftId]/logbook`: aircraft-tail logbook foundation.
- `/aircraft/[aircraftId]/crew`: aircraft-block crew assignment workflow.
- `/aircraft/[aircraftId]/airworthiness`: aircraft airworthiness workflow.
- `/aircraft/[aircraftId]/fuel`: aircraft fuel ledger.
- `/maintenance`: maintenance-user action queue and aircraft maintenance state
  workbench.
- `/admin/settings`: operator settings including Jet A density, dispatcher
  support, and manifest mode.
- `/crew`: crew roster.
- `/crew/[crewMemberId]`: crew member context.
- `/crew/[crewMemberId]/compliance`: ops/admin crew compliance management.
- `/crew/[crewMemberId]/logistics`: ops/admin crew logistics management.
- `/crew/me`: active linked crew-user phone/iPad self-service portal.
- `/crew/portal`: older linked crew-user self-service portal; do not expand
  unless explicitly requested.
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
- Crew eligibility is evaluated as of the FlightLeg scheduled departure.
  `CrewPlannedComplianceEvent` can make an assignment show as pending, but it
  does not make the role covered until completed/current evidence exists.
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
- Ops Release, Preflight, and Postflight are separate phases. Ops Release owns
  crew and maintenance, optional dispatch, optional ops-owned manifest, and
  flight-plan/locating basis. Preflight owns fuel, weight-and-balance, and
  preflight manifest verification when configured. Postflight owns OUT/OFF/ON/IN
  times, landing/postflight fuel, and delay notes when delayed.
- `Customer` and `Passenger` remain separate reusable records. A customer may be
  a company, broker, or individual account; a passenger is a traveler/person.
  `CustomerPassenger` links them, and `ManifestItem` is the FlightLeg-specific
  manifest source of truth.
- `/aircraft` is currently a focused fleet/status board, not the full
  maintenance workbench. Keep the list compact and aircraft oriented; deeper
  maintenance concepts belong in drilldowns and the future Maintenance module.
- Maintenance is a top-level module in the main navigation for `ADMIN` and
  `MAINTENANCE` users, not a top-level Logbook tab. V1 is a triage workbench:
  Queue first, Scheduled Maintenance second, compact review drawer, and links
  to existing aircraft/logbook/airworthiness routes. Create/sign/template/admin
  workflows remain deeper or later slices.
- Maintenance serviceability is computed in `lib/aircraft-serviceability.ts`.
  Do not use a routine current `AirworthinessRelease` as the normal
  serviceability gate. Open official discrepancies require approved deferral or
  signed Return to Service before the aircraft is serviceable. See
  `docs/MAINTENANCE_SERVICEABILITY_RTS_LIFECYCLE.md`.

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

Recent frontend/product slices passed:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run smoke:customer-passenger-manifest`
- Browser checks for customer/manifest flows and latest aircraft filters.

Recent UI work also includes `/crew/me` crew-portal refinement, passenger ID
photo capture, passenger check-in/boarding controls, compact `/aircraft` row
and drawer cleanup, initial aircraft crew coverage planner cleanup, and the
first `/maintenance` triage workbench. The latest maintenance lifecycle pass
also added computed serviceability and Return to Service validation.

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
  - `docs/AIRCRAFT_MAINTENANCE_LOGBOOK_REGULATORY_REFERENCE.md`
  - `docs/MAINTENANCE_SERVICEABILITY_RTS_LIFECYCLE.md`

## Next Safe Planning Choices

The active priority is frontend/UI polish. Choose one narrow slice at a time,
and preserve the backend contracts documented in `docs/BACKEND_MVP_STATE.md`.

- Finish aircraft crew coverage planner polish.
- Continue `/crew/me` crew portal polish around today's flights, passenger
  workflow, flight detail, requests, schedule, and profile.
- Continue `/crew/scheduling` hardening while preserving the planning-vs-
  staffing boundary.
- Polish `/maintenance` around queue filters, drawer detail, scheduled
  maintenance rows, and demo data before adding create/sign/admin workflows.
- Add the `/aircraft` create drawer after the current aircraft/status and
  maintenance module direction is accepted.
- Continue UI polish for dashboard, flights, customers, aircraft, crew,
  scheduling, release evidence, compliance, logistics, and maintenance.
- Backend follow-ups only when they are explicit post-MVP decisions.

Avoid broad multi-feature implementation without a fresh plan.

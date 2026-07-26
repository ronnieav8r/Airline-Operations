# Schema Decisions

These decisions supersede the Bubble-derived reference docs where they differ.

## Product Assumptions

- This is a greenfield app.
- The reference docs are useful context, not binding requirements.
- Ops/Admin workflows come first.
- Crew self-service is limited in v1.
- The app should favor clear relational data over Bubble migration parity.
- The app should grow toward a compliance-ready operations model for Part 91, Part 91K, and Part 135-style small operators.
- Use one shared canonical schema with authority-specific validations rather than separate data models for each regulatory part.
- Deployments are single-customer by default. Each customer/operator group gets
  a separate app/database; `Operator` is a legal/business entity inside that
  deployment, not a SaaS tenant boundary.

## Backend MVP State

Backend MVP scaffolding is complete for the current warning-first operational
scope. See `docs/BACKEND_MVP_STATE.md`, `docs/BACKEND_MVP_FINAL_SMOKE_QA.md`,
and `docs/BACKEND_MVP_GAP_REVIEW.md`.

Future schema changes should be treated as post-MVP backend work unless they
are required to support approved frontend readiness or UI polish.

## Maintenance Serviceability And Return To Service

`MX-002R` adds `MaintenanceControlHold` as an independent audited availability
blocker, with a partial unique index allowing one `ACTIVE` hold per aircraft.
Scheduled planning uses nullable `MaintenanceEvent.plannedStationId`,
`scheduledAt`, and `planNote`; `PLANNED` is non-blocking and creates no
logbook entry. Required-inspection designation propagates from program task to
occurrence and logbook entry. `ReturnToServiceRecord` retains the regulatory
maintenance signer/profile snapshot and separately stores Maintenance Control
release actor/time/note. `MaintenanceEvent.returnToServiceAt` and discrepancy
clearing are set only by the Maintenance Control release transaction.

Maintenance serviceability is computed, not manually stored as the primary
aircraft release decision. Use
`docs/MAINTENANCE_SERVICEABILITY_RTS_LIFECYCLE.md` and
`lib/aircraft-serviceability.ts` as the current source of truth.

Current lifecycle:

- A new official discrepancy starts `OPEN` and makes the aircraft not
  serviceable.
- An approved MEL/CDL/NEF/company/other approved deferral can move the
  discrepancy to `DEFERRED` and surface limitations.
- Corrective maintenance can move the discrepancy to
  `CORRECTED_PENDING_RTS`.
- Only a signed `ReturnToServiceRecord` clears a corrected discrepancy.
- `AirworthinessRelease` remains historical/operator-specific evidence, not
  the normal everyday maintenance gate.

## Major Scaffolding Roadmap

The remaining major scaffolding is now planned in
`docs/MAJOR_SCAFFOLDING_MACRO_PLAN.md`.

Implementation should run dependency-first:

1. Local auth, operational roles, sessions, and user attribution.
2. Controlled FlightLeg cutover and additive ReleasePackage.
3. Crew compliance depth.
4. Crew scheduling publish/pattern/request lifecycle.
5. Crew self-service and crew logistics.

Do not implement hard release blocking, legal signatures, provider
integrations, file uploads, shared multi-tenant SaaS scoping, destructive
legacy `Flight` removal, or duty/rest legal enforcement without a later
decision-complete plan.

Local auth planning is complete in `docs/LOCAL_AUTH_PLAN.md`. The first auth
schema slice should expand operational roles and add local password credential
plus DB-backed session primitives. The app should populate existing nullable
user attribution fields only after the relevant route/action is protected.
Attribution is not a legal signature.

FlightLeg cutover planning is complete in `docs/FLIGHTLEG_CUTOVER_PLAN.md`.
Legacy `Flight` remains for compatibility/archive until visible app reads,
coverage APIs, and parity diagnostics prove that `FlightLeg` can serve as the
primary operational anchor. Do not drop `Flight`, `FlightPassenger`,
`CrewFlightLog`, or `/api/flights/[id]` compatibility paths in the current
chain.

ReleasePackage planning is complete in `docs/RELEASEPACKAGE_PLAN.md`.
`ReleasePackage` should be additive and wrap the existing `FlightRelease`.
`FlightRelease` remains the release decision/status record until a later
decision-complete transition.

Prompt 170 implements that additive foundation with `ReleasePackage` and
`ReleasePackageEvidenceLink`. No current `FlightRelease` action behavior changes.

## Updated Long-Term Direction

The current schema is a v1 operations foundation, not the final regulatory data model.

The long-term anchor should be:

```text
Operator -> OperatingAuthority -> FlightLeg
TripOrMission -> FlightLeg
FlightLeg -> AircraftAssignment
FlightLeg -> CrewAssignment
FlightLeg -> OperationalControlRecord
FlightLeg -> Manifest
FlightLeg -> WeightBalanceRun
FlightLeg -> FlightLocatingRecord
FlightLeg -> ReleasePackage
```

`FlightLeg` is now the primary operational identity for new backend work. The
legacy `Flight` table remains compatibility/archive, bridged by
`FlightLeg.legacyFlightId`, and must not be destructively removed without a
later retirement plan.

Temporary write policy: the first FlightLeg write workflow maintains both
records. Creating or editing a FlightLeg through Operations Control also
creates or updates the legacy `Flight` row in the same transaction. This keeps
existing crew coverage APIs, fallback reads, and Flight-to-FlightLeg parity
diagnostics valid until the remaining APIs are migrated off the legacy anchor.

DBML references:

- `docs/schema.current.dbml` is the clean current-state DBML for the implemented schema.
- `docs/schema.planning.flightleg.dbml` is the planning DBML for the future `FlightLeg`-anchored product model.

Before the product grows into a broad scheduling or dispatch surface, every
operational leg should identify the governing rule set, controlling entity,
release decision, and authority/manual revision in effect. The additive
foundation for this now exists through `OperationalControlRecord.flightLegId`,
but current reads still preserve the legacy `flightId` link.

## Crew Assignment Model

Use aircraft-block crew assignment for v1.

Crew members are assigned to an aircraft, seat role, and time interval. Flights inherit crew from the assigned aircraft at scheduled departure.

This matches the expected operation:

- A crew member is tied to an aircraft going forward until relieved.
- A flight will not change crew mid-block.
- If a crew member is swapped out early, close their assignment and create a new one for the replacement.
- If a flight changes aircraft, crew display follows the new aircraft.

This remains valid for the first operational slice. Longer term, aircraft-block crew assignment should feed a leg-level release/readiness model rather than being the whole operating model.

Current transition state:

- `AircraftCrewAssignment` still drives current crew coverage reads.
- `CrewLegAssignment` now snapshots the resolved aircraft-block crew onto
  `FlightLeg` during seed/backfill.
- FlightLegs created or edited by Operations Control snapshot resolved
  aircraft-block crew onto `CrewLegAssignment`; current crew coverage still
  resolves through the legacy `Flight` bridge until a later crew workflow
  promotes leg-level crew operations.
- Do not treat `CrewLegAssignment` as the source of truth for current pages
  until a later read-migration slice validates parity.
- The first controlled crew assignment write workflow should mutate
  `AircraftCrewAssignment` only, then resync affected future
  `CrewLegAssignment` snapshots. Qualification and coverage issues are warnings
  in this phase, not blockers.
- The broader Crew Scheduling module is a planning and availability lane for
  schedules, days off, vacation/time-off, duty/rest, reserve, training, and
  schedule import/apply behavior. It should help determine who is available for
  aircraft-block staffing, but it should not replace `AircraftCrewAssignment`
  as the operational coverage source.

## Preferred V1 Tables

- `User`
- `UserProfile`
- `Station`
- `Aircraft`
- `Flight`
- `CrewMember`
- `CrewQualification`
- `AircraftCrewAssignment`
- `CrewSchedule`
- `CrewFlightLog`
- `Passenger`
- `FlightPassenger`
- `TimeOffRequest`
- `Alert`
- `DutyRule`

These tables are now considered the minimum v1 dashboard and crew-resolution foundation. They should not be interpreted as the complete Part 91K/135 data model.

## Tables To Avoid In V1

- `CrewRoster`
- `CrewSeatAssignment`
- Legacy `CrewAssignment`
- `Trip`
- `Pairing`
- `DutyPeriod`
- `AircraftRotation`
- `MaintenanceEvent`
- Rich audit/event tables

These can be added later if the product needs them, but they should not complicate v1.

Revised interpretation:

- Avoid these in the already-completed foundation slice.
- Do not avoid them forever.
- `TripOrMission`, `FlightLeg`, `OperationalControlRecord`, `Manifest`, `WeightBalanceRun`, `FlightLocatingRecord`, `MaintenanceEvent`, `Discrepancy`, `DutyPeriod`, and `RestPeriod` are expected roadmap items once the app moves beyond the current dashboard/crew-resolution foundation.

## Crew Resolution Rule

Resolve crew for a flight using:

```text
Flight.aircraftId
Flight.scheduledDeparture
```

Find active `AircraftCrewAssignment` rows where:

```text
aircraftId = flight.aircraftId
startsAt <= flight.scheduledDeparture
endsAt IS NULL OR endsAt > flight.scheduledDeparture
```

Return crew grouped by `seatRole`.

Required cockpit coverage for v1:

- `CPT`
- `FO`

Coverage APIs accept either a legacy `Flight.id` or a `FlightLeg.id`. Responses
include FlightLeg-primary identity aliases while preserving legacy fields and
compatibility paths. Aircraft-block assignment remains the active crew source
of truth.

Missing roles should produce coverage warnings.

## Crew Scheduling Boundary

Crew Scheduling should answer who appears available and suitable. It should not
answer who is operationally assigned to an aircraft.

Durable responsibilities:

- `CrewSchedule` records planned availability, duty state, reserve, training,
  and station context.
- `TimeOffRequest` records requested or approved absence.
- Future duty/rest records should support compliance checks.
- `AircraftCrewAssignment` records the actual aircraft-block staffing decision
  that flights inherit.
- `CrewLegAssignment` records FlightLeg snapshot/evidence.

Future Crew Scheduling automation may suggest or prefill aircraft-block
assignment changes, but it should not silently apply them. Actual coverage
changes should remain explicit `AircraftCrewAssignment` mutations.

Prompt 134 expands Crew Scheduling into a full internal AeroOps module. The
long-term scheduling architecture uses flexible schedule periods, first-class
crew bids/requests, reusable rotation pattern templates, and a
`BID_OPEN -> DRAFTING -> PUBLISHED -> ARCHIVED` lifecycle. Published schedules
remain recommendation/availability context only and must not auto-create
`AircraftCrewAssignment` rows.

Current schema support is intentionally shallow:

- `CrewSchedule` can represent individual schedule blocks, but it has no
  schedule period, draft/published state, bid linkage, pattern source, or
  finalization workflow.
- `TimeOffRequest` can support basic time-off requests, but not broader
  period-scoped bid/request workflows, schedule preferences, pattern requests,
  or swaps.
- Crew positioning/logistics is deferred to a later module and should not be
  added until separately planned.

Prompt 135 selected the first additive scheduling schema direction. Keep
existing `CrewSchedule` as the current simple planner/availability row and add
new future schedule-building tables beside it:

- `CrewSchedulePeriod`
- `CrewScheduleRequest`
- `CrewRotationPattern`
- `CrewRotationPatternDay`
- `CrewScheduleEntry`

Use additive enums for schedule period lifecycle, request status, and schedule
entry status. Published schedule entries remain recommendation/availability
context only and must not auto-create `AircraftCrewAssignment` rows.

Prompt 136 should implement this schema foundation only. Do not add schedule
writes, time-off review, schedule publishing, auth, assignment automation,
duty/rest enforcement, positioning logistics, imports, or provider
integrations.

Prompt 136 implementation is complete. The new scheduling tables exist beside
`CrewSchedule`. Existing planner and aircraft assignment behavior should remain
unchanged until later read/write workflow slices explicitly migrate behavior.

## Qualification Rule

Model qualifications by crew member, aircraft type, and seat role.

Use warning-first enforcement in v1:

- Missing qualification: warn, do not block.
- Expired qualification: warn, do not block.
- Duty rule conflict: warn, do not block.

Ops/Admin should be able to continue after seeing warnings.

Future qualification work should split the broad qualification idea into
separate records for certificates/ratings, medicals, training events, check
events, route checks, recency events, duty periods, and rest periods. The
current `CrewQualification` table is intentionally shallow.

Prompt 174 planning is complete in `docs/CREW_COMPLIANCE_PLAN.md`. The selected
direction is additive: keep `CrewQualification` for current compatibility
warnings and add richer compliance evidence tables beside it. Prompt 175 should
add schema only for `CrewCertificate`, `CrewMedical`, `CrewTrainingEvent`,
`CrewCheckEvent`, `CrewRecencyEvent`, `CrewDutyPeriod`, and `CrewRestPeriod`.
Those records should feed warning-only surfaces first, not hard release
blocking or legal duty/rest enforcement.

Prompt 175 implementation is complete. The seven crew compliance evidence
tables now exist additively with nullable created/verified user attribution and
health counts. No UI, seed data, CRUD workflow, hard blocking, or duty/rest
legal enforcement was added.

Prompts 176-181 completed the first crew compliance scaffolding chain around
that schema: demo seed/backfill support, read-only crew/planner surfaces,
warning-only aircraft assignment context, warning-only release readiness
context, QA docs, and status refresh. Compliance records remain evidence and
warning inputs, not hard release blockers.

Prompt 230 plans admin workflows on top of the existing compliance schema. No
new schema is expected for the first admin workflow chain; use
`CrewCertificate`, `CrewMedical`, `CrewTrainingEvent`, `CrewCheckEvent`,
`CrewRecencyEvent`, `CrewDutyPeriod`, and `CrewRestPeriod` directly.

Prompts 231-235 completed the first admin workflow chain using the existing
compliance schema. No schema changes were required. Compliance records remain
evidence and warning inputs, not staffing truth or release blockers.

## History Rule

Keep full assignment history.

- Do not overwrite old assignment rows to hide history.
- To relieve a crew member, set `endsAt`.
- To assign a replacement, create a new row.

Extend this principle to future compliance records. Manuals, authority revisions, qualifications, release decisions, maintenance actions, and safety/corrective-action records should favor versioned or append-only history over silent overwrites.

## V1 Deferrals

Do not build these into the initial schema unless a later prompt explicitly asks for them:

- Trip/pairing model
- Flight-level crew overrides
- Maintenance tracking
- Crew schedule periods
- Crew bid/request workflow
- Rotation pattern templates
- Crew positioning/logistics
- File uploads for qualification documents
- Full audit log
- Advanced reports
- TV mode

## Near-Term Roadmap Tables

When the next schema-oriented slice is approved, prefer this order:

1. `Operator`, `OperatingAuthority`, `AuthorityRevision`, `Manual`, `ManualRevision`
2. `OperationalControlRecord`, `FlightRelease`
3. `TripOrMission`, `FlightLeg`, `AircraftAssignment`, `CrewLegAssignment`, `TurnaroundLink`
4. `Manifest`, `ManifestItem`, `WeightBalanceRun`, `FlightLocatingRecord`, `DispatchPackage`
5. `Discrepancy`, `Deferral`, `MaintenanceEvent`, `AirworthinessRelease`
6. `CertificateRating`, `MedicalCertificate`, `TrainingEvent`, `CheckEvent`, `RouteCheck`, `RecencyEvent`, `DutyPeriod`, `RestPeriod`
7. `SafetyReport`, `Hazard`, `RiskAssessment`, `Mitigation`, `CorrectiveAction`

Items 1 through 5 are now implemented as additive foundations. A hidden parity
diagnostic now compares `Flight` and `FlightLeg` reads before any UI or API is
rewired to the new leg anchor. `/operations-control` now pilots read-only
FlightLeg reads with legacy `Flight` fallback. `/flights` and `/` now use the
same fallback pattern while preserving legacy `Flight` IDs for crew coverage.
Broader page/API migrations should follow this pattern until the transition is
complete.

Release evidence has a separate implementation boundary in
`docs/RELEASE_EVIDENCE_SCHEMA_DECISIONS.md`. `Manifest`, `ManifestItem`,
`WeightBalanceRun`, `FlightLocatingRecord`, `DispatchPackage`,
`WeatherBriefingSnapshot`, `NotamSnapshot`, and `FlightPlanReference` now exist
as additive tables against `FlightLeg`. `ReleasePackage` and `PositionReport`
should remain deferred until their workflows are planned.

The first UI exposure for release evidence is read-only summary data on
Dashboard and Operations Control. Do not add evidence CRUD or provider-backed
fetches until the read-only summaries and a future detail view are validated.

The first detail exposure is `/operations-control/[flightLegId]`, a read-only
FlightLeg evidence packet. It is intentionally a drilldown, not a workflow
surface. Evidence mutation, dispatch-package assembly, and release-package
transition work remain deferred.

Release status controls now exist on the FlightLeg detail page. They mutate
`FlightRelease.status` and keep `FlightLeg.status` aligned for parity, but they
do not mutate manifests, weight and balance, locating records, weather/NOTAM
snapshots, flight-plan references, or dispatch packages.

Release-blocking policy planning is complete in
`docs/RELEASE_BLOCKING_POLICY.md`. Current `FlightRelease` actions remain
warning-only. The next safe implementation should preview blocker vs warning
classifications before any hard enforcement, override workflow, auth/signature
policy, authority-specific engine, or `ReleasePackage` transition.

Release-blocking preview is implemented on FlightLeg detail. It labels existing
readiness findings as `Would block release`, `Would warn`, or `No blocker`
without enforcing blocking or changing schema.

Release-blocking data model planning is complete in
`docs/RELEASE_BLOCKING_DATA_MODEL_PLAN.md`. The additive schema foundation is
now implemented with `ReleasePolicyProfile`, `ReleasePolicyRule`,
`ReleaseReadinessSnapshot`, `ReleaseReadinessFinding`, `ReleaseOverride`, and
`ReleaseAuditEvent`. Only policy profiles and rules are seeded today; current
release behavior remains warning-only. Do not add hard blocking, readiness
snapshot creation, override workflow, auth/signature implementation, or
provider-backed verification until a later prompt approves it.

Release snapshot policy planning is complete in
`docs/RELEASE_SNAPSHOT_POLICY.md`. The first snapshot implementation should be
explicit preview capture only from FlightLeg detail. It must not create
snapshots on page load or release actions, and it must not change
`FlightRelease.status`.

Scheduling now follows the same FlightLeg-backed read pattern as Dashboard,
Flights, and Operations Control, while preserving legacy `Flight` fallback and
legacy Flight IDs for crew coverage resolution.

Aircraft now follows the FlightLeg-backed read pattern for current/next flight
context, while preserving aircraft-block crew assignments, qualification
warnings, aircraft alerts, and legacy fallback.

Crew now follows the FlightLeg-backed read pattern for upcoming coverage context,
while preserving legacy Flight IDs for current coverage resolution and keeping
aircraft-block assignment as the active crew source. The main read-only surfaces
are now far enough along to support the first FlightLeg write workflow.

Operations Control now owns the first controlled write path for core leg/control
data. It writes `FlightLeg`, the legacy `Flight` bridge, auto `TripOrMission`,
planned `AircraftAssignment`, `OperationalControlRecord`, planned
`FlightRelease`, and adjacent same-aircraft `TurnaroundLink` rows together.
Release evidence, dispatch package assembly, manifest mutation, weight and
balance mutation, and crew leg assignment promotion remain deferred.

Airworthiness planning now lives in
`docs/AIRWORTHINESS_SCHEMA_DECISIONS.md`. The next additive schema foundation
should add `AircraftConfiguration`, `AircraftCapability`, `Discrepancy`,
`Deferral`, `MaintenanceEvent`, and `AirworthinessRelease`. `Aircraft.status`
remains a v1 fleet-board signal. Component maintenance, reliability analytics,
provider integrations, file uploads, and hard release blocking remain deferred.

Airworthiness additive schema foundation is now implemented. The new
airworthiness tables have local seed data, a gated demo backfill, health counts,
and DBML coverage. Do not add airworthiness mutation, component tracking, or
hard release blocking until a follow-up planning slice approves it.

Crew Scheduling now has an additive schema foundation beside the existing
`CrewSchedule` table. `CrewSchedulePeriod`, `CrewScheduleRequest`,
`CrewRotationPattern`, `CrewRotationPatternDay`, and `CrewScheduleEntry` support
future bid/request, pattern, draft, and published-schedule workflows, while
`CrewSchedule` remains the current planner availability row and
`AircraftCrewAssignment` remains the operational coverage source. The first
admin surface is read-only under `/crew/scheduling/periods`; do not add schedule
writes, publish/finalize actions, crew portal/auth behavior, duty/rest
enforcement, assignment automation, or positioning logistics until separately
planned.

Prompt 140 QA confirmed the read-only schedule-period admin routes render
against the additive scheduling schema. The schema boundary is unchanged:
schedule-period admin visibility is allowed, but schedule publishing and
schedule mutation workflows remain deferred.

Time-off workflow planning is complete. The first workflow should use existing
`TimeOffRequest` records directly for ops/admin absence request entry and
review. `CrewScheduleRequest` remains reserved for future period-scoped bids,
preferences, swaps, and pattern requests. Approving or cancelling time off must
not create or mutate `CrewSchedule`, `CrewScheduleEntry`,
`AircraftCrewAssignment`, `CrewLegAssignment`, release records, or release
readiness behavior.

The first time-off workflow is now implemented without schema changes. It
creates and reviews `TimeOffRequest` rows only. Any future desire for review
notes, cancellation reasons, approval history, or period linkage should be
planned as a separate additive schema slice.

Crew schedule-entry planning is complete. The first `CrewScheduleEntry`
workflow should use the existing additive table for manual `DRAFT` entry
create/edit/cancel inside a schedule period. These rows remain crew
availability planning records only. They must not publish schedules, generate
legacy `CrewSchedule` rows, apply rotation patterns, approve requests, or
mutate `AircraftCrewAssignment` or `CrewLegAssignment` records.

Crew Logistics now has an additive schema foundation. `CrewLocationRecord`
tracks crew location context over time, and `CrewLogisticsNeed` tracks
positioning, deadhead, airline ticket, hotel, ground transport, and other
travel-support placeholders. These records are planning/context data only.
They do not replace `CrewScheduleEntry`, `CrewSchedule`,
`AircraftCrewAssignment`, `CrewLegAssignment`, or crew duty/rest evidence, and
they do not imply booking, expense, release, or assignment automation.

Prompt 209 keeps the existing logistics schema for the next depth slice. The
next implementation should add a central `/crew/logistics` workbench with
filters, grouping, summary counts, and cross-links. No provider integration,
booking table, itinerary attachment table, expense table, or automatic
positioning recommendation schema is approved yet.

Duty/rest policy settings now exist as an additive configuration foundation.
`DutyRestPolicyProfile` stores authority-level calculation/enforcement settings
and `DutyRestRuleSetting` stores report-derived rule settings such as Part 91
guardrails, Part 135 unscheduled/on-demand warnings, and future Part 91K
warnings. `DutyRule` remains as a shallow legacy/demo threshold table. The new
settings do not perform legal calculations, persist warning snapshots, block
schedule publication, block aircraft assignment, block release, or create
signature semantics. All defaults are warning-only pending operator/legal
review.

Prompt 207 plans the first calculator without schema changes. Prompt 208 should
reuse existing release-readiness snapshot findings for persistence and should
not add `CrewDutyRestWarning` yet. The initial calculator may use current
`CrewDutyPeriod`, `CrewRestPeriod`, FlightLeg schedule, crew assignment, and
duty/rest policy rows for warning-only Part 135 unscheduled/on-demand checks
and ordinary Part 91 guardrails. Missing outside commercial flying,
reserve/standby detail, transportation classification, reduced-rest
compensation, actual flight-time, OpSpecs/MSpecs, and flight-attendant data
should remain explicit missing-input/deferred findings rather than schema
assumptions.

Prompt 211 verified local FlightLeg cutover readiness against seeded data.
Parity and both-ID coverage resolver checks passed, but the schema boundary is
unchanged: legacy `Flight`, `FlightPassenger`, `CrewFlightLog`,
`OperationalControlRecord.flightId`, and `FlightLeg.legacyFlightId` remain for
compatibility/archive behavior. The next safe cutover step is response-shape and
API compatibility planning, not table removal.

Prompt 212 plans the response-shape cutover without schema changes. Prompt 213
should add FlightLeg-primary identity aliases to crew/coverage API responses:
`operationalFlightLegId`, `legacyFlightId`, `inputId`, and `identitySource`.
Existing `flightId` and `flightLegId` fields remain for compatibility. This is
an API contract transition only, not a table migration.

Prompt 213 is implemented. The shared coverage resolver and compatibility API
routes now expose the FlightLeg-primary aliases while preserving existing
fields and accepting both `FlightLeg.id` and legacy `Flight.id` inputs. Legacy
`Flight` remains compatibility/archive and should not be removed without a
separate retirement plan.

Prompt 214 plans the next cutover as internal-consumer migration only. Helpers
and pages should prefer FlightLeg IDs for coverage lookups where bridges exist,
while preserving legacy fallback rows, public compatibility paths, and legacy
response fields.

Prompt 216 implements that first internal-consumer migration for crew-heavy
coverage callers. This remains a behavior-preserving cutover: no schema change,
API path change, response-field removal, or legacy `Flight` retirement.

Prompt 221 inventories the remaining legacy `Flight` dependencies in
`docs/FLIGHTLEG_LEGACY_DEPENDENCY_INVENTORY.md`. The schema decision is
unchanged: legacy `Flight`, `FlightPassenger`, `CrewFlightLog`,
`OperationalControlRecord.flightId`, `FlightLeg.legacyFlightId`, and
`/api/flights/[id]` compatibility paths remain in place for MVP.

Prompt 222 completes the remaining safe internal consumer cutover without a
schema change. FlightLeg is now the preferred internal read identity for the
targeted crew, scheduling, and time-off surfaces; legacy `Flight` remains
compatibility/archive.

Prompt 223 documents the MVP archive policy in
`docs/FLIGHTLEG_LEGACY_ARCHIVE_POLICY.md`. Legacy `Flight` is compatibility and
archive state for MVP, not the preferred operational identity. This does not
approve destructive removal.

Fuel is modeled as an aircraft operational ledger plus FlightLeg release
evidence. `OperatorFuelSetting` stores the operator default Jet A density for
pounds-to-gallons conversion, and `AircraftFuelEvent` stores aircraft fuel
events with the density used on each event. Pounds remain source-of-truth;
gallons are approximate. FlightLeg release readiness uses
`RELEASE_ONBOARD + fueledReady = true` as the fuel-ready signal, while
`POSTFLIGHT_ONBOARD` supports consumed-fuel review after the leg. Fuel does not
replace W&B records, aircraft airworthiness releases, or `FlightRelease`, and
does not introduce hard release blocking.

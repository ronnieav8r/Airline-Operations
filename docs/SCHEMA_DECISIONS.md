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

The current `Flight` table remains the active UI/API read model. `FlightLeg`
now exists additively as the future operational anchor, bridged by
`FlightLeg.legacyFlightId`.

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
- Do not treat `CrewLegAssignment` as the source of truth for current pages
  until a later read-migration slice validates parity.

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

Missing roles should produce coverage warnings.

## Qualification Rule

Model qualifications by crew member, aircraft type, and seat role.

Use warning-first enforcement in v1:

- Missing qualification: warn, do not block.
- Expired qualification: warn, do not block.
- Duty rule conflict: warn, do not block.

Ops/Admin should be able to continue after seeing warnings.

Future qualification work should split the broad qualification idea into separate records for certificates/ratings, medicals, training events, check events, route checks, recency events, duty periods, and rest periods. The current `CrewQualification` table is intentionally shallow.

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

Items 1 through 3 are now implemented as additive foundations. A hidden parity
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

Scheduling now follows the same FlightLeg-backed read pattern as Dashboard,
Flights, and Operations Control, while preserving legacy `Flight` fallback and
legacy Flight IDs for crew coverage resolution.

Aircraft now follows the FlightLeg-backed read pattern for current/next flight
context, while preserving aircraft-block crew assignments, qualification
warnings, aircraft alerts, and legacy fallback.

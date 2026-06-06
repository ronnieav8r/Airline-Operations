# Compliance Roadmap

This roadmap updates the AeroOps Center gameplan after reviewing Part 91, Part 91K, and Part 135 data-model research.

The current schema remains useful as a small v1 operations foundation. It should now be treated as the starting point for a compliance-ready operations system, not as the final model.

Schema reference files:

- `docs/schema.current.dbml` captures the implemented current-state schema.
- `docs/schema.planning.flightleg.dbml` captures the planning model using `FlightLeg` as the future operational anchor.

## Product Direction

AeroOps Center should grow toward a shared canonical schema for small operators that may fly under different operating contexts:

- Part 91
- Part 91K fractional ownership operations
- Part 135 charter or commuter operations

The app should avoid separate databases or unrelated modules for each rule set. Instead, use common people, aircraft, flight-leg, maintenance, and safety entities with authority-specific validations.

## Anchor Entities

Future schema work should orient around these anchors:

- `Operator`
- `OperatingAuthority`
- `FlightLeg`
- `Aircraft`
- `CrewMember`
- `CrewQualification`

The current `Flight` table remains the active UI/API read model. `FlightLeg`
now exists as an additive foundation bridged by `FlightLeg.legacyFlightId`, so
future schema work should move carefully from comparison to read migration.

## Highest-Priority Schema Direction

### 1. Authority and Operational Control

Add this before the app becomes a broader flight-management surface.

Likely future tables:

- `Operator`
- `OperatingAuthority`
- `AuthorityRevision`
- `Manual`
- `ManualRevision`
- `OperationalControlRecord`
- `FlightRelease`

Each operational leg should eventually identify:

- the governing authority or rule set
- the controlling entity
- the responsible operational-control person or role
- the release decision
- the authority/manual revision in effect

### 2. Trip, Mission, and Flight Leg

The current `Flight` model is acceptable for v1, but the long-term model should separate the customer-facing trip from the operational leg.

Foundation tables now added:

- `TripOrMission`
- `FlightLeg`
- `AircraftAssignment`
- `CrewLegAssignment`
- `TurnaroundLink`

Likely later tables:

- `DelayEvent`
- `Irregularity`

Design principle:

```text
TripOrMission -> FlightLeg -> AircraftAssignment + CrewAssignment + ReleasePackage
```

### 3. Manifest, Weight and Balance, and Flight Locating

Move these out of "advanced later" thinking. They are core operational records for 91K and 135-style workflows.

Likely future tables:

- `Manifest`
- `ManifestItem`
- `WeightBalanceRun`
- `FlightLocatingRecord`
- `DispatchPackage`
- `FlightPlanReference`
- `WeatherBriefingSnapshot`
- `NotamSnapshot`

The app should be able to answer what information was available and relied on for a specific released leg.

### 4. Fleet, Airworthiness, and Maintenance

The current `Aircraft.status` field is only a v1 dashboard signal. It is not enough for a production operations system.

Likely future tables:

- `AircraftConfiguration`
- `AircraftCapability`
- `MaintenanceEvent`
- `Discrepancy`
- `Deferral`
- `AirworthinessRelease`
- `MaintenanceProvider`
- `ServiceDifficultyReport`

Maintenance records should capture who performed work, who approved return to service, what discrepancy or deferral was affected, and which aircraft or component state changed.

### 5. Crew, Training, Recency, Duty, and Rest

The current `CrewQualification` table is a useful starting point, but it is too shallow for serious 91K/135 tracking.

Likely future tables:

- `CertificateRating`
- `MedicalCertificate`
- `TrainingEvent`
- `CheckEvent`
- `RouteCheck`
- `RecencyEvent`
- `DutyPeriod`
- `RestPeriod`
- `ExperienceLedger`

Future validation should answer:

```text
May this crew legally and safely fly this leg in this aircraft under this authority right now?
```

### 6. Safety and SMS

Do not build full SMS first, but reserve the domain now. Part 135 operators have a live Part 5 SMS path, and safety reporting is also relevant to 91K-style operations.

Likely future tables:

- `SafetyReport`
- `Hazard`
- `RiskAssessment`
- `Mitigation`
- `CorrectiveAction`
- `SafetyAssuranceReview`
- `SafetyPromotionEvent`

## Updated Build Sequence

The completed first slices were intentionally narrow:

1. Foundation and schema
2. Crew-resolution API
3. Read-only operations dashboard
4. App shell navigation
5. Authority and operational-control foundation
6. Read-only operational pages for flights, operations control, aircraft, crew, and scheduling
7. Additive FlightLeg transition foundation

The next major schema-oriented slices should be:

1. Flight-to-FlightLeg read comparison and parity checks
2. Manifest, flight locating, and release package
3. Maintenance discrepancy and airworthiness signals
4. Crew training, checks, recency, duty, and rest
5. Safety/SMS intake and corrective-action loop

Each slice should remain small and reviewable.

## What Not To Do

Do not jump directly to a large all-in schema migration.

Do not create separate schemas for Part 91, Part 91K, and Part 135.

Do not keep building user interface features that assume `Flight` is the complete operational record.

Do not treat `Aircraft.status` as the complete maintenance or airworthiness model.

Do not treat crew qualification as a single current flag.

## Current V1 Still Valid

The current aircraft-block crew assignment decision remains valid for the first operational slice. It is a pragmatic way to resolve crew coverage without introducing trip, pairing, duty-period, or flight-level override complexity too early.

As the app grows, aircraft-block assignment should become one input into flight-leg release readiness, not the whole operating model.

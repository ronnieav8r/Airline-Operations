# Schema Decisions

These decisions supersede the Bubble-derived reference docs where they differ.

## Product Assumptions

- This is a greenfield app.
- The reference docs are useful context, not binding requirements.
- Ops/Admin workflows come first.
- Crew self-service is limited in v1.
- The app should favor clear relational data over Bubble migration parity.

## Crew Assignment Model

Use aircraft-block crew assignment for v1.

Crew members are assigned to an aircraft, seat role, and time interval. Flights inherit crew from the assigned aircraft at scheduled departure.

This matches the expected operation:

- A crew member is tied to an aircraft going forward until relieved.
- A flight will not change crew mid-block.
- If a crew member is swapped out early, close their assignment and create a new one for the replacement.
- If a flight changes aircraft, crew display follows the new aircraft.

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

## History Rule

Keep full assignment history.

- Do not overwrite old assignment rows to hide history.
- To relieve a crew member, set `endsAt`.
- To assign a replacement, create a new row.

## V1 Deferrals

Do not build these into the initial schema unless a later prompt explicitly asks for them:

- Trip/pairing model
- Flight-level crew overrides
- Maintenance tracking
- File uploads for qualification documents
- Full audit log
- Advanced reports
- TV mode

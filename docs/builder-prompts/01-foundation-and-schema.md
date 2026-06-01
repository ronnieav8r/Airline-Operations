# Builder Prompt 01: Foundation And Schema

You are building the first small slice of AeroOps Center in this repository.

Do not build the full app yet. This prompt is only for project foundation and the database schema.

## Context

Read these files first:

- `README.md`
- `docs/SCHEMA_DECISIONS.md`

The repo is expected to be nearly empty. Create the initial app structure.

## Goal

Initialize a production-ready Next.js + TypeScript + Prisma + PostgreSQL foundation for AeroOps Center, with the v1 relational schema based on aircraft-block crew assignment.

## Required Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- npm package scripts

Use conventional, boring defaults unless the repo already contains a stronger pattern.

## Required Work

1. Initialize the Next.js app in the repository root.
2. Add Prisma and configure PostgreSQL through `DATABASE_URL`.
3. Create `prisma/schema.prisma` with the v1 schema.
4. Add a Prisma client singleton.
5. Add `.env.example`.
6. Add basic seed data in `prisma/seed.ts`.
7. Add package scripts for development, build, typecheck, Prisma generate, migration, and seed.
8. Add a minimal home page that proves the app runs.

## Schema Requirements

Enums:

- `SeatRole`: `CPT`, `FO`, `FA`, `CA`
- `FlightStatus`: `SCHEDULED`, `ENROUTE`, `COMPLETE`, `CANCELLED`, `DELAYED`
- `AircraftType`: `CL_65`, `EMB_135_145`
- `AircraftStatus`: `AVAILABLE`, `IN_MAINTENANCE`, `RESERVED`, `IN_FLIGHT`, `OUT_OF_SERVICE`
- `EmploymentStatus`: `ACTIVE`, `INACTIVE`, `ON_LEAVE`, `TERMINATED`
- `DutyStatus`: `ON_DUTY`, `RESERVE`, `OFF_DUTY`, `VACATION`, `SICK`, `TRAINING`, `DEADHEADING`
- `AlertType`: `CREW_SHORTAGE`, `MAINTENANCE`, `WEATHER`, `SCHEDULE_CONFLICT`, `DUTY_VIOLATION`, `GENERAL`
- `AlertSeverity`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `AlertStatus`: `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`
- `TimeOffRequestType`: `VACATION`, `SICK`, `PERSONAL`, `TRAINING`, `OTHER`
- `TimeOffRequestStatus`: `PENDING`, `APPROVED`, `DENIED`, `CANCELLED`
- `IdDocumentType`: `PASSPORT`, `DRIVERS_LICENSE`, `STATE_ID`, `MILITARY_ID`, `OTHER`
- `UserRole`: `ADMIN`, `OPS`, `CREW`

Models:

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

Important modeling rule:

- `AircraftCrewAssignment` should directly relate `Aircraft`, `CrewMember`, and `SeatRole`.
- Do not add `CrewRoster` or `CrewSeatAssignment` in this slice.
- Do not add trip, pairing, maintenance, upload, or audit tables in this slice.

The important assignment fields are:

```text
aircraftId
crewMemberId
seatRole
startsAt
endsAt nullable
status or active flag if useful
assignedById optional
notes optional
```

Indexes should support:

- flight filtering by scheduled departure, status, aircraft
- crew assignment resolution by aircraft and time
- crew schedule lookup by crew member and date
- alert filtering by status/type/created date

## Seed Data

Create enough seed data to validate relationships:

- 3 stations
- 2 aircraft
- 5 crew members
- crew qualifications for at least cockpit roles
- aircraft crew assignments for one fully covered aircraft
- one aircraft missing an `FO`
- 5 flights across yesterday, today, and tomorrow
- a few crew schedules
- passengers and flight passengers
- at least one active crew shortage alert
- at least one expired or missing qualification warning scenario represented in data

## Acceptance Criteria

- `npm install` succeeds.
- `npx prisma validate` succeeds.
- `npx prisma generate` succeeds.
- A migration can be created against PostgreSQL.
- `npm run build` succeeds.
- `npm run typecheck` succeeds.
- Seed script runs against a configured PostgreSQL database.
- No app pages beyond the minimal proof-of-run home page are required.

## Do Not Do Yet

- Do not build auth UI.
- Do not build dashboard UI.
- Do not build CRUD pages.
- Do not deploy to Render.
- Do not add report pages.
- Do not add TV mode.
- Do not implement file uploads.
- Do not introduce flight-level crew overrides.

## Final Response Expected From Builder

Report:

- files created
- commands run
- whether validation/build/typecheck passed
- any assumptions made
- any blockers that require planner/user decision

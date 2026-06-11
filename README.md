# AeroOps Center

AeroOps Center is a greenfield airline operations web app for small airline,
charter, or air taxi operations.

This repository now contains an active Next.js, TypeScript, Prisma, and
PostgreSQL implementation. Builder chats should still work in small,
reviewable slices and should not attempt the full product in one pass.

## Current Build Direction

- App type: internal operations web app
- Primary users: Ops/Admin
- Secondary users: Crew with limited self-service and read-only operational visibility
- Suggested stack: Next.js, TypeScript, PostgreSQL, Prisma, Render
- First release scope: operational core with a compliance-ready path
- Deferred: advanced reports, TV mode, uploads, rich analytics
- Compliance roadmap: [docs/COMPLIANCE_ROADMAP.md](docs/COMPLIANCE_ROADMAP.md)
- Local development: [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md)
- Smoke testing: [docs/SMOKE_TESTING.md](docs/SMOKE_TESTING.md)
- Builder onboarding: [docs/BUILDER_ONBOARDING.md](docs/BUILDER_ONBOARDING.md)
- Current project status: [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)
- Macro scaffolding plan: [docs/MAJOR_SCAFFOLDING_MACRO_PLAN.md](docs/MAJOR_SCAFFOLDING_MACRO_PLAN.md)
- Macro QA log: [docs/MACRO_SCAFFOLDING_QA_LOG.md](docs/MACRO_SCAFFOLDING_QA_LOG.md)
- Current-state DBML: [docs/schema.current.dbml](docs/schema.current.dbml)
- FlightLeg planning DBML: [docs/schema.planning.flightleg.dbml](docs/schema.planning.flightleg.dbml)

The current implementation is a broad operational scaffolding slice, not the
final regulatory product. It includes FlightLeg-centered operations control,
release evidence, ReleasePackage previews, aircraft context, aircraft
airworthiness, crew assignment, crew compliance, crew scheduling lifecycle,
crew self-service, and crew logistics foundations.

Runtime QA for recent macro-chain work should be completed when Docker Desktop
is available. Static validation currently passes.

## Core Schema Decision

Crew assignment should be aircraft-block based, not flight-row based and not Bubble-style roster-chain based.

In v1, a crew member is assigned directly to an aircraft seat role for a time interval:

```text
AircraftCrewAssignment
- aircraftId
- crewMemberId
- seatRole
- startsAt
- endsAt
```

A flight resolves crew by finding active assignments for its aircraft at the flight's scheduled departure time.

`FlightLeg` is now the long-term operational anchor. The legacy `Flight` table
still exists for compatibility/archive behavior until parity is proven and
retirement is separately planned.

`AircraftCrewAssignment` remains the operational crew coverage source.
`CrewScheduleEntry` and `CrewSchedule` support crew availability planning, not
aircraft staffing truth. Crew Logistics tracks location and travel-support
needs only; it does not book travel, create expenses, or automate positioning.

See [docs/SCHEMA_DECISIONS.md](docs/SCHEMA_DECISIONS.md).

## Builder Prompt Sequence

Use one builder prompt at a time. Completed prompts are preserved under
[docs/builder-prompts](docs/builder-prompts) for audit context. Future prompts
should read `docs/BUILDER_ONBOARDING.md`, `docs/PROJECT_STATUS.md`, and the
domain-specific planning doc before extending the app.

Future prompts should build on completed code and stay limited to one app
slice.

# AeroOps Center

AeroOps Center is a greenfield airline operations web app for small airline, charter, or air taxi operations.

This repository is intentionally starting from planning docs instead of generated app code. Builder chats should work in small, reviewable slices and should not attempt the full product in one pass.

## Current Build Direction

- App type: internal operations web app
- Primary users: Ops/Admin
- Secondary users: Crew with limited self-service and read-only operational visibility
- Suggested stack: Next.js, TypeScript, PostgreSQL, Prisma, Render
- First release scope: operational core with a compliance-ready path
- Deferred: advanced reports, TV mode, uploads, rich analytics
- Compliance roadmap: [docs/COMPLIANCE_ROADMAP.md](docs/COMPLIANCE_ROADMAP.md)
- Local development: [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md)

The current implementation is a small v1 operations slice. It should not be treated as the final regulatory data model. Future schema work should move toward a flight-leg-centered, authority-aware operating model that can support Part 91, Part 91K, and Part 135 workflows without splitting into separate mini-systems.

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

The current `Flight` table should be understood as the v1 stand-in for the future operational `FlightLeg` anchor. Before the app grows much beyond dashboard and crew-resolution workflows, add authority, operational-control, manifest, locating, and release concepts around each leg.

See [docs/SCHEMA_DECISIONS.md](docs/SCHEMA_DECISIONS.md).

## Builder Prompt Sequence

Use one builder prompt at a time. Completed prompts are preserved for audit context; future prompts should read the current schema decisions and compliance roadmap before extending the app.

1. [docs/builder-prompts/01-foundation-and-schema.md](docs/builder-prompts/01-foundation-and-schema.md)
2. [docs/builder-prompts/02-crew-resolution-api.md](docs/builder-prompts/02-crew-resolution-api.md)
3. [docs/builder-prompts/03-operations-dashboard-readonly.md](docs/builder-prompts/03-operations-dashboard-readonly.md)
4. [docs/builder-prompts/04-app-shell-navigation.md](docs/builder-prompts/04-app-shell-navigation.md)
5. [docs/builder-prompts/05-authority-operational-control-foundation.md](docs/builder-prompts/05-authority-operational-control-foundation.md)

Future prompts should build on completed code and should stay limited to one app slice.

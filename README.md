# AeroOps Center

AeroOps Center is a greenfield airline operations web app for small airline, charter, or air taxi operations.

This repository is intentionally starting from planning docs instead of generated app code. Builder chats should work in small, reviewable slices and should not attempt the full product in one pass.

## Current Build Direction

- App type: internal operations web app
- Primary users: Ops/Admin
- Secondary users: Crew with limited self-service and read-only operational visibility
- Suggested stack: Next.js, TypeScript, PostgreSQL, Prisma, Render
- First release scope: operational core only
- Deferred: advanced reports, TV mode, uploads, maintenance tracking, trip/pairing system, rich analytics

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

See [docs/SCHEMA_DECISIONS.md](docs/SCHEMA_DECISIONS.md).

## Builder Prompt Sequence

Use one builder prompt at a time:

1. [docs/builder-prompts/01-foundation-and-schema.md](docs/builder-prompts/01-foundation-and-schema.md)

Future prompts should build on completed code and should stay limited to one app slice.

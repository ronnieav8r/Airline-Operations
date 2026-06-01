# Builder Prompt 02: Crew Resolution API

You are building the second small slice of AeroOps Center.

Do not build the full app yet. This prompt is only for crew-resolution domain logic and a few read-only API routes.

## Context

Read these files first:

- `README.md`
- `docs/SCHEMA_DECISIONS.md`
- `docs/builder-prompts/01-foundation-and-schema.md`
- `docs/builder-prompts/02-crew-resolution-api.md`
- `prisma/schema.prisma`

## Goal

Implement the core crew-resolution logic that lets the app answer:

- Who is assigned to this flight?
- Is this flight missing required cockpit coverage?
- Does an aircraft have active crew coverage at a timestamp?
- Are there qualification warnings for assigned crew?

This slice should be read-only. Do not build mutation routes, UI pages, auth UI, dashboards, or CRUD screens.

## Required Work

1. Add a small domain/service layer for crew resolution.
2. Add API routes that expose resolved crew and coverage checks.
3. Add focused tests if the current toolchain supports them without adding too much scope.
4. Keep all code type-safe against the Prisma schema.
5. Ensure `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## Required Behavior

Crew resolution must use:

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

Cockpit coverage rules for v1:

- `CPT` is required.
- `FO` is required.
- `FA` and `CA` are optional for now.

Qualification warning rules:

- If assigned crew lacks a matching `CrewQualification` for the aircraft type and assigned seat role, return a warning.
- If the matching qualification has `expiresAt` before the flight scheduled departure, return a warning.
- Warnings do not block the response.

## API Routes

Add these read-only routes:

```text
GET /api/flights/[id]/crew
GET /api/flights/[id]/coverage
GET /api/aircraft/[id]/crew-assignments?at=ISO_DATE
```

Expected behavior:

- Missing records return `404`.
- Invalid dates return `400`.
- Unexpected failures return `500`.
- Error shape should be `{ error: string, details?: unknown }`.

Response shape can be simple and pragmatic, but must include enough information for future UI:

```text
crew member id
crew member name
seat role
assignment id
assignment interval
qualification warning status
```

Coverage response should include:

```text
flight id
aircraft id
required roles
missing roles
assigned crew
warnings
isCovered
```

## Suggested Files

Use these paths unless a better local pattern already exists:

- `lib/crew-resolution.ts`
- `lib/api-errors.ts`
- `app/api/flights/[id]/crew/route.ts`
- `app/api/flights/[id]/coverage/route.ts`
- `app/api/aircraft/[id]/crew-assignments/route.ts`

## Do Not Do Yet

- Do not add auth enforcement yet.
- Do not build UI.
- Do not add crew assignment mutation routes.
- Do not add dashboard pages.
- Do not introduce flight-level crew overrides.
- Do not add trip/pairing/duty-period tables.
- Do not require a live database for build/typecheck success.

## Acceptance Criteria

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run build` passes.
- `npm run prisma:validate` passes.
- The API routes compile without needing a live PostgreSQL connection.
- The implementation follows aircraft-based crew assignment rules from `docs/SCHEMA_DECISIONS.md`.

## Final Response Expected From Builder

Report:

- files created/changed
- commands run
- validation/build/typecheck results
- assumptions made
- blockers requiring planner/user decision

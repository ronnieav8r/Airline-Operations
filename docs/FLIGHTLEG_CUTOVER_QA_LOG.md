# FlightLeg Cutover QA Log

Last updated: 2026-06-11

## Prompt 168

Static validation passed:

- Prisma schema validation.
- TypeScript typecheck.
- ESLint.
- Production build.

Local runtime QA is pending because Docker Desktop was unavailable. The local
database start command could not connect to the Docker Desktop Linux engine.

## Verified By Static Checks

- FlightLeg-primary board helpers compile for dashboard, flights, and aircraft.
- Crew coverage resolver compiles with FlightLeg-first resolution and legacy
  compatibility response fields.
- Existing routes still compile in the production build.

## Pending Runtime Verification

- Route smoke for `/`, `/flights`, `/aircraft`, `/crew`, `/crew/scheduling`,
  `/operations-control`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.
- Coverage API smoke with both FlightLeg IDs and legacy Flight IDs.
- FlightLeg create/edit bridge parity after auth and read cutover changes.

## Prompt 211

Local runtime QA completed with Docker Postgres available.

Passed:

- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Targeted FlightLeg/legacy Flight resolver parity script.
- `npm run smoke:app`
- `npm run smoke:browser`

Targeted parity result:

- 5 bridged FlightLeg rows checked.
- 0 coverage/crew resolver mismatches between FlightLeg ID and legacy Flight ID.
- `getFlightLegParityReport()` summary:
  - total flights: 5
  - linked legs: 5
  - passing rows: 5
  - failing rows: 0
  - missing FlightLeg rows: 0
  - crew mismatches: 0
  - aircraft mismatches: 0
  - control mismatches: 0
  - turnaround mismatches: 0

Decision: the app is ready for the next controlled FlightLeg-native coverage
planning slice, but not for destructive legacy `Flight` removal. Keep `Flight`,
`FlightPassenger`, `CrewFlightLog`, `OperationalControlRecord.flightId`,
`FlightLeg.legacyFlightId`, and `/api/flights/[id]` compatibility paths.

## Prompt 223

Local runtime QA completed after Prompt 222 moved the remaining safe internal
consumers to FlightLeg-primary reads.

Passed:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `/internal/flightleg-parity`
- `/internal/flightleg-write-readiness`
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

Workflow smoke run label:

- `SMOKE-20260611130557`

Decision: FlightLeg is the preferred backend MVP operational identity. Legacy
`Flight` remains compatibility/archive only and must not be destructively
removed without a later retirement plan.

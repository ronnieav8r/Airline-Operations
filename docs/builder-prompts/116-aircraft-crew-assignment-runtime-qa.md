# Prompt 116: Aircraft Crew Assignment Runtime QA

## Summary

Complete the local runtime QA pass for the Prompt 114 aircraft-block crew
assignment workflow after Docker Desktop is available.

Prompt 116 is QA/docs only. No app code, schema, auth, release policy, duty/rest
enforcement, crew schedule import, vacation/time-off enforcement, or
leg-specific crew override behavior was added.

## Local Database Prep

- Started Docker Desktop.
- Ran `npm run db:local:up`.
- Ran `npm run db:local:migrate`.
- Ran `npm run db:local:seed`.

Local demo data after seed included aircraft, crew members, FlightLegs,
aircraft-block assignments, and CrewLeg snapshots.

## Runtime Workflow QA

Direct server-action smoke was run against the local database:

- Created an aircraft-block `AircraftCrewAssignment`.
- Edited the assignment seat role, start/end time, and notes.
- Relieved the assignment.
- Verified the assignment rows changed as expected.

Snapshot resync QA was also run against future FlightLeg `AO404`:

- Created an aircraft-block FO assignment covering the FlightLeg scheduled
  departure.
- Confirmed a matching `CrewLegAssignment` snapshot was created with status
  `PLANNED` and linked to the source aircraft-block assignment.
- Relieved the source aircraft-block assignment.
- Confirmed the matching `CrewLegAssignment` snapshot changed to `RELIEVED`
  with a `releaseTime`.

Direct server-action execution outside a browser request hits Next.js
post-action revalidation boundaries. Database state was used as the source of
truth after each mutation.

## Route And Render QA

Route smoke returned 200 for:

- `/`.
- `/aircraft`.
- `/aircraft/[aircraftId]`.
- `/aircraft/[aircraftId]/crew`.
- `/aircraft/[aircraftId]/airworthiness`.
- `/crew`.
- `/operations-control`.
- `/operations-control/[flightLegId]`.
- `/flights`.
- `/scheduling`.
- `/api/health`.
- `/internal/flightleg-parity`.
- `/internal/flightleg-write-readiness`.

Rendered page content for `/aircraft/[aircraftId]/crew` included:

- Aircraft Crew Assignment.
- Create aircraft-block assignment.
- Current assignments.
- Upcoming assignments.
- Future FlightLeg snapshot impact.
- Qualification warnings.
- Relieve Now.
- Edit assignment.

## Validation

- `npm run prisma:validate` passed.
- `npm run typecheck` passed after rerunning once build route-type generation
  had settled.
- `npm run lint` passed.
- `npm run build` passed.

## Result

Prompt 116 passed. The aircraft-block crew assignment workflow is locally
validated for create, edit, relieve/end, warning-only qualification display,
route rendering, and future FlightLeg snapshot resync.

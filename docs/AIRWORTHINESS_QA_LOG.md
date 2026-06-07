# Airworthiness QA Log

Last updated: 2026-06-07

This log captures focused validation for the aircraft-level airworthiness
workflow.

## Prompt 45 QA

Validation commands passed:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Local workflow smoke passed against Docker Postgres:

- Created a draft aircraft airworthiness release.
- Created a `RELEASED` aircraft airworthiness release.
- Created a second `RELEASED` aircraft airworthiness release.
- Confirmed the prior released record became `SUPERSEDED`.
- Voided the draft release.
- Confirmed the smoke aircraft had exactly one current `RELEASED`
  airworthiness release after the workflow.

Local route smoke passed:

- `/`
- `/aircraft`
- `/aircraft/[aircraftId]/airworthiness`
- `/operations-control`
- `/operations-control/[flightLegId]`
- `/api/health`
- `/internal/flightleg-parity`
- `/internal/flightleg-write-readiness`

Notes:

- Server actions were invoked directly during local smoke. The expected
  Next.js `revalidatePath` context error can occur after the database write
  when actions are called outside a Next request; the smoke verified persisted
  database state after each action.
- No schema changes, auth/signature work, hard release blocking, provider
  integrations, file uploads, or operational `FlightRelease` mutations were
  added.

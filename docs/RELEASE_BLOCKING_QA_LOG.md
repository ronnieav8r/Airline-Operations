# Release Blocking QA Log

Last updated: 2026-06-07

This log captures validation for release-blocking policy and preview work.

## Prompt 48 QA

Validation commands passed:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime route checks:

- `/`
- `/operations-control`
- `/operations-control/[flightLegId]`
- `/api/health`
- `/internal/flightleg-parity`
- `/internal/flightleg-write-readiness`

Runtime route checks passed.

Workflow checks passed:

- FlightLeg detail rendered Release Readiness.
- FlightLeg detail rendered non-enforcing release-blocking preview markers.
- Release Control remained visible.
- Mark released changed the linked `FlightRelease.status` to `RELEASED` and set
  `releasedAt`.
- Cancel release changed the linked `FlightRelease.status` to `CANCELLED` and
  cleared `releasedAt`.
- Void release changed the linked `FlightRelease.status` to `VOIDED` and kept
  `releasedAt` clear.
- The release-blocking preview did not block release actions.

Local smoke FlightLeg:

```text
AO101 / cmq3nb5h40029v8q8urbwt1bf
```

Notes:

- Server actions were invoked directly during local smoke. The expected
  Next.js `revalidatePath` context error can occur after the database write
  when actions are called outside a Next request; the smoke verified persisted
  database state after each action.

Scope guard:

- No schema changes.
- No hard release blocking.
- No auth/signature or override workflow.
- No provider integrations.
- No file uploads.
- No evidence mutation.

# Release Evidence QA Log

This log records local QA results for release-evidence workflows.

## 2026-06-07 - Prompt 66: Weight-and-Balance Approval QA

Status: passed.

Local database:

- `npm run db:local:up` passed.
- `npm run db:local:migrate` passed with no pending migrations.
- Local health returned `ok: true` with nonzero FlightLeg and W&B counts.

Validation:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Workflow QA:

- Approved a complete `CALCULATED` W&B run for local FlightLeg `AO101`.
- Confirmed approval set `APPROVED`, populated `approvedAt`, and kept
  `approvedById` null.
- Confirmed a DRAFT W&B run could not be approved.
- Confirmed an incomplete `CALCULATED` W&B run could not be approved.
- Confirmed a run could not be approved through the wrong FlightLeg route.
- Confirmed an approved run could not be edited.
- Confirmed an approved run could not be voided.
- Confirmed non-approved Mark Calculated behavior still works.

Route smoke:

- `/` returned 200.
- `/operations-control` returned 200.
- `/operations-control/[flightLegId]` returned 200.
- `/operations-control/[flightLegId]/weight-balance` returned 200.
- `/api/health` returned 200.
- `/internal/flightleg-parity` returned 200.
- `/internal/flightleg-write-readiness` returned 200.
- `/flights` returned 200.
- `/aircraft` returned 200.
- `/crew` returned 200.
- `/scheduling` returned 200.

Browser QA:

- `http://localhost:3200/operations-control/[flightLegId]/weight-balance`
  rendered the W&B workflow.
- Confirmed visible `Approve` action.
- Confirmed visible approved timestamp label.
- Confirmed visible `APPROVED` and `CALCULATED` statuses.
- Confirmed visible back link to FlightLeg detail.

Notes:

- Direct server-action QA outside a browser request produced expected
  redirect/revalidation exceptions after mutation attempts. Database state was
  used as the source of truth for pass/fail.
- Release behavior remains warning-only.

## 2026-06-07 - Prompt 71: Manual Flight Locating Position History QA

Status: passed.

Local database:

- `npm run db:local:up` passed.
- `npm run db:local:migrate` passed with no pending migrations.
- Local health returned `ok: true` with nonzero `positionReports`.

Validation:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Workflow QA:

- Created a newer manual position report for local FlightLeg `AO101`.
- Created an older manual position report for the same FlightLeg.
- Confirmed both reports exist and are ordered by reported time.
- Confirmed the newest report remained
  `FlightLocatingRecord.lastKnownPosition`.
- Confirmed the older report did not overwrite the newer summary.
- Deleted the locating parent for local FlightLeg `AO202`, then created a
  report and confirmed the parent `FlightLocatingRecord` was recreated.
- Confirmed all QA reports used source `MANUAL`.

Route smoke:

- `/` returned 200.
- `/operations-control` returned 200.
- `/operations-control/[flightLegId]` returned 200.
- `/operations-control/[flightLegId]/locating` returned 200.
- `/api/health` returned 200.
- `/internal/flightleg-parity` returned 200.
- `/internal/flightleg-write-readiness` returned 200.
- `/flights` returned 200.
- `/aircraft` returned 200.
- `/crew` returned 200.
- `/scheduling` returned 200.

Browser QA:

- `http://localhost:3200/operations-control/[flightLegId]/locating` rendered
  the locating workflow.
- Confirmed visible Add position report form.
- Confirmed visible Recent position reports section.
- Confirmed visible newest and older Prompt 71 reports.
- Confirmed visible `Source MANUAL` and back link to FlightLeg detail.

Notes:

- Direct server-action QA outside a browser request produced expected
  redirect/revalidation exceptions after mutation attempts. Database state was
  used as the source of truth for pass/fail.
- Release behavior remains warning-only.

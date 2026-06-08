# Release Evidence QA Log

This log records local QA results for release-evidence workflows.

## 2026-06-08 - Prompt 115: Aircraft Crew Assignment QA

Status: code validation passed; runtime workflow smoke blocked by local Docker
availability.

Validation:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Runtime QA:

- `npm run db:local:up` did not start the local PostgreSQL container because
  Docker Desktop was not running.
- Direct local database lookup against `127.0.0.1:5434` failed because the
  local database was unavailable.
- Database-backed route smoke and browser workflow checks were not completed in
  this pass.

Implementation checks:

- Confirmed Prompt 114 added `/aircraft/[aircraftId]/crew`.
- Confirmed aircraft fleet and aircraft context pages link to the crew
  assignment workflow.
- Confirmed the edit workflow preserves the selected crew member and only edits
  seat role, start/end time, and notes.
- Confirmed create, edit, and Relieve Now actions resync affected future
  `CrewLegAssignment` snapshots in the same transaction.
- Confirmed qualification and CPT/FO coverage signals are warning-only.

Notes:

- Prompt 115 did not add schema, duty/rest enforcement, crew schedule imports,
  vacation/time-off enforcement, leg-specific crew overrides, auth/signatures,
  or hard release blocking.
- The required follow-up is local runtime workflow QA after Docker Desktop is
  available.

## 2026-06-08 - Prompt 112: Aircraft Context Detail QA

Status: passed.

Validation:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Aircraft context QA:

- Confirmed `/aircraft` returned 200.
- Confirmed `/aircraft` includes Aircraft Context links.
- Confirmed `/aircraft/[aircraftId]` returned 200 for a local aircraft.
- Confirmed `/aircraft/[aircraftId]` renders Overview, Current Assignment,
  Upcoming Legs, Airworthiness, Crew Coverage, Alerts, and Operations Links.
- Confirmed `/aircraft/[aircraftId]` includes links to Operations Control
  detail, edit, Manifest, W&B, Locating, and Dispatch when FlightLeg-backed
  legs exist.
- Confirmed `/aircraft/[aircraftId]/airworthiness` returned 200.

Route smoke:

- `/aircraft` returned 200.
- `/aircraft/[aircraftId]` returned 200.
- `/aircraft/[aircraftId]/airworthiness` returned 200.
- `/operations-control` returned 200.
- `/operations-control/[flightLegId]` returned 200.
- `/` returned 200.
- `/flights` returned 200.
- `/crew` returned 200.
- `/scheduling` returned 200.
- `/api/health` returned 200.
- `/internal/flightleg-parity` returned 200.
- `/internal/flightleg-write-readiness` returned 200.

Notes:

- Prompt 112 was QA/docs only.
- The in-app browser execution tool was not available beyond reset in this
  turn, so QA used local route and rendered-content inspection.
- No workflow behavior changed.
- Release behavior remains warning-only.
- No schema, auth, hard blocking, import behavior, provider integration, file
  upload, AI behavior, or new release policy was added.

## 2026-06-08 - Prompt 109: Dashboard Surfacing QA

Status: passed.

Validation:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Dashboard QA:

- Confirmed `/` returned 200.
- Confirmed dashboard renders Operations Attention.
- Confirmed dashboard renders Priority FlightLegs.
- Confirmed dashboard renders the AI Review Notes placeholder.
- Confirmed the placeholder says no AI provider is connected and does not
  represent active AI behavior.
- Confirmed today's flight board still renders.
- Confirmed coverage gaps, active alerts, and fleet snapshot still render.

Workflow link QA:

- Confirmed dashboard includes links for FlightLeg Detail, Manifest, W&B,
  Locating, Dispatch, and Operations Control.
- Confirmed one live FlightLeg detail route returned 200.
- Confirmed the dashboard did not add or change release actions.

Route smoke:

- `/` returned 200.
- `/operations-control` returned 200.
- `/operations-control/[flightLegId]` returned 200.
- `/flights` returned 200.
- `/aircraft` returned 200.
- `/crew` returned 200.
- `/scheduling` returned 200.
- `/api/health` returned 200.
- `/internal/flightleg-parity` returned 200.
- `/internal/flightleg-write-readiness` returned 200.

Browser QA:

- Browser check confirmed Operations Attention, Priority FlightLegs, AI Review
  Notes placeholder, today's flight board, coverage gaps, active alerts, and
  fleet snapshot.
- Browser check confirmed direct workflow links for Detail, Manifest, W&B,
  Locating, Dispatch, and the Operations Control workbench.

Notes:

- Prompt 109 was QA/docs only.
- No workflow behavior changed.
- Release behavior remains warning-only.
- No AI/provider code, note persistence, recommendations engine, or automation
  was added.

## 2026-06-08 - Prompt 106: Operations Control Workbench QA

Status: passed.

Validation:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Workbench QA:

- Confirmed default `/operations-control` returned 200.
- Confirmed grouping URLs returned 200 for release, schedule, and aircraft.
- Confirmed release, evidence, and combined-filter URLs returned 200.
- Confirmed workbench controls render with grouping, release, evidence,
  operating-part, and aircraft filters.
- Confirmed board cards include links for Detail, Edit, Manifest, W&B,
  Locating, and Dispatch.
- Confirmed the existing Control Records table still renders below the board.

Route smoke:

- `/` returned 200.
- `/operations-control` returned 200.
- `/operations-control/[flightLegId]` returned 200.
- `/flights` returned 200.
- `/aircraft` returned 200.
- `/crew` returned 200.
- `/scheduling` returned 200.
- `/api/health` returned 200.
- `/internal/flightleg-parity` returned 200.
- `/internal/flightleg-write-readiness` returned 200.

Browser QA:

- Browser check confirmed the workbench on a combined-filter URL.
- Browser check confirmed grouping controls, schedule grouping, evidence filter
  state, action links, and the retained Control Records table.

Notes:

- Prompt 106 was QA/docs only.
- No workflow behavior changed.
- Release behavior remains warning-only.

## 2026-06-08 - Prompt 103: FlightLeg Detail Information Architecture QA

Status: passed.

Validation:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Layout QA:

- Confirmed all five local FlightLeg detail pages returned 200.
- Confirmed all five local FlightLeg detail pages rendered the command-center
  layout markers.
- Confirmed section navigation exposes Readiness, Release History,
  Aircraft/Airworthiness, Evidence Details, and Raw Reference Data.
- Confirmed Release Evidence Actions and Release Control render near the top.
- Confirmed evidence workflow routes returned 200 for manifest, W&B, locating,
  and dispatch.
- Confirmed an aircraft airworthiness link returned 200.
- Confirmed an existing snapshot detail link returned 200.

Route smoke:

- `/` returned 200.
- `/operations-control` returned 200.
- `/operations-control/[flightLegId]` returned 200.
- `/flights` returned 200.
- `/aircraft` returned 200.
- `/crew` returned 200.
- `/scheduling` returned 200.
- `/api/health` returned 200.
- `/internal/flightleg-parity` returned 200.
- `/internal/flightleg-write-readiness` returned 200.

Browser QA:

- Browser check confirmed the command-center layout on a local FlightLeg detail
  page.
- Browser check confirmed all six page section IDs exist.
- Browser check confirmed five section navigation links.
- Browser check confirmed visible Release Control, Release Evidence Actions,
  and Raw Reference Data.

Notes:

- Prompt 103 was QA/docs only.
- No workflow behavior changed.
- Release behavior remains warning-only.

## 2026-06-07 - Prompt 85: Release Audit Timeline QA

Status: passed.

Validation:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Timeline QA:

- Used local FlightLeg `cmq3xifbh0029v85guciafavn`.
- Confirmed local data includes release audit events for the FlightLeg.
- Confirmed FlightLeg detail renders the `Release Audit Timeline`.
- Confirmed visible release event type such as `RELEASE_VOIDED`.
- Confirmed actor placeholder displays as `System / unauthenticated`.
- Confirmed visible snapshot link text.
- Confirmed the linked snapshot detail route returned 200.
- Confirmed Release Control remains visible.

Route smoke:

- `/` returned 200.
- `/operations-control` returned 200.
- `/operations-control/[flightLegId]` returned 200.
- `/operations-control/[flightLegId]/snapshots/[snapshotId]` returned 200.
- `/internal/release-snapshot-readiness` returned 200.
- `/api/health` returned 200.
- `/flights` returned 200.
- `/aircraft` returned 200.
- `/crew` returned 200.
- `/scheduling` returned 200.

Browser QA:

- `http://localhost:3200/operations-control/[flightLegId]` rendered the
  FlightLeg detail page.
- Confirmed visible `Release Audit Timeline`.
- Confirmed visible `RELEASE_VOIDED`.
- Confirmed visible `Snapshot`.
- Confirmed visible `System / unauthenticated`.
- Confirmed visible `Release Control`.

Notes:

- The timeline is read-only.
- Release behavior remains warning-only.

## 2026-06-07 - Prompt 81: Release Attempt Snapshot QA

Status: passed.

Validation:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Workflow QA:

- Used local FlightLeg `cmq3xifbh0029v85guciafavn`.
- Mark Released changed `FlightRelease.status` to `RELEASED`.
- Mark Released created a `source: "release-attempt"` readiness snapshot.
- Mark Released created a linked `RELEASE_COMPLETED` audit event.
- Cancel Release changed `FlightRelease.status` to `CANCELLED`.
- Cancel Release created a `source: "release-attempt"` readiness snapshot.
- Cancel Release created a linked `RELEASE_CANCELLED` audit event.
- Void Release changed `FlightRelease.status` to `VOIDED`.
- Void Release created a `source: "release-attempt"` readiness snapshot.
- Void Release created a linked `RELEASE_VOIDED` audit event.
- Explicit preview capture still created a `source: "explicit-preview"`
  snapshot with findings.
- Workflow smoke added four snapshots and three audit events in total.

Route smoke:

- `/` returned 200.
- `/operations-control` returned 200.
- `/operations-control/[flightLegId]` returned 200.
- `/internal/release-snapshot-readiness` returned 200.
- `/api/health` returned 200.
- `/flights` returned 200.
- `/aircraft` returned 200.
- `/crew` returned 200.
- `/scheduling` returned 200.

Browser QA:

- `http://localhost:3200/operations-control/[flightLegId]` rendered the
  FlightLeg detail page.
- Confirmed visible `Release Evidence Detail`.
- Confirmed visible `Preview Snapshots`.
- Confirmed visible `Release Control`.
- Confirmed visible warning-only release messaging.

Notes:

- Direct server-action QA outside a browser request produced expected
  redirect/revalidation exceptions after mutation attempts. Database state was
  used as the source of truth for pass/fail.
- Release behavior remains warning-only.

## 2026-06-07 - Prompt 78: Dispatch Review Freshness QA

Status: passed.

Validation:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Panel QA:

- Used local FlightLeg `cmq3xifbh0029v85guciafavn`.
- Confirmed FlightLeg detail renders the Release Evidence Actions panel.
- Confirmed the dispatch card shows the dispatch package review state.
- Confirmed the local `VOIDED` dispatch package surfaces as needing attention.
- Confirmed the dispatch card shows voided timestamp context.
- Confirmed Release Control remains visible and release behavior remains
  warning-only.

Route smoke:

- `/` returned 200.
- `/operations-control` returned 200.
- `/operations-control/[flightLegId]` returned 200.
- `/operations-control/[flightLegId]/dispatch` returned 200.
- `/flights` returned 200.
- `/aircraft` returned 200.
- `/crew` returned 200.
- `/scheduling` returned 200.
- `/api/health` returned 200.

Browser QA:

- `http://localhost:3200/operations-control/[flightLegId]` rendered the
  FlightLeg detail page.
- Confirmed visible `Release Evidence Actions`.
- Confirmed visible dispatch package card.
- Confirmed visible `Dispatch package is voided` message.
- Confirmed visible `Needs attention` state.
- Confirmed visible warning-only release messaging.

Notes:

- Prompt 78 was QA/docs only.
- No release-action behavior changed.

## 2026-06-07 - Prompt 76: Dispatch Package Review State QA

Status: passed.

Local database:

- `npm run db:local:up` passed.
- `npm run db:local:migrate` passed with no pending migrations after the
  Prompt 75 additive migration was applied.

Validation:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Workflow QA:

- Used local FlightLeg `cmq3xifbh0029v85guciafavn`.
- Saved incomplete manual dispatch evidence and confirmed package remained
  `DRAFT`.
- Attempted Mark Ready with incomplete evidence and confirmed the package
  stayed `DRAFT`.
- Saved complete manual dispatch evidence and confirmed it remained `DRAFT`
  until manually marked ready.
- Marked the package `READY` and confirmed `readyAt` was set.
- Marked the ready package `REVIEWED` and confirmed `reviewedAt`, review notes,
  and null `reviewedById`.
- Edited the reviewed package and confirmed it reset to `DRAFT` and cleared
  review state.
- Marked the package ready again, then voided it and confirmed `VOIDED` plus
  `voidedAt`.

Route smoke:

- `/` returned 200.
- `/operations-control` returned 200.
- `/operations-control/[flightLegId]` returned 200.
- `/operations-control/[flightLegId]/dispatch` returned 200.
- `/flights` returned 200.
- `/aircraft` returned 200.
- `/crew` returned 200.
- `/scheduling` returned 200.
- `/api/health` returned 200.
- `/internal/flightleg-parity` returned 200.
- `/internal/flightleg-write-readiness` returned 200.

Browser QA:

- `http://localhost:3200/operations-control/[flightLegId]/dispatch` rendered
  the dispatch workflow.
- Confirmed visible `Dispatch review state` section.
- Confirmed visible `Mark Ready`, `Mark Reviewed`, and `Void Package` actions.
- Confirmed visible `VOIDED` status after workflow smoke.
- Confirmed visible note that review is workflow state only.

Notes:

- Direct server-action QA outside a browser request produced expected
  redirect/revalidation exceptions after mutation attempts. Database state was
  used as the source of truth for pass/fail.
- Release actions remain warning-only and unchanged.

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

## 2026-06-07 - Prompt 73: Locating Freshness QA

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

Fixture setup:

- Prepared local FlightLeg `AO101` with a latest manual position report.
- Prepared local FlightLeg `AO303` with `ACTIVE` locating status and no
  position reports.

Panel QA:

- Confirmed AO101 FlightLeg detail shows Release Evidence Actions.
- Confirmed AO101 locating card shows latest position summary and freshness
  text.
- Confirmed AO303 FlightLeg detail shows the no-position-report message.
- Confirmed AO303 locating card shows needs-attention state in the panel.
- Confirmed Release Control still renders on both FlightLeg detail pages.

Route smoke:

- `/` returned 200.
- `/operations-control` returned 200.
- `/operations-control/[flightLegId]` returned 200 for both locating states.
- `/operations-control/[flightLegId]/locating` returned 200.
- `/api/health` returned 200.
- `/flights` returned 200.
- `/aircraft` returned 200.
- `/crew` returned 200.
- `/scheduling` returned 200.

Browser QA:

- Confirmed latest-position state in the browser.
- Confirmed no-position-report needs-attention state in the browser.
- Confirmed Release Control remains visible.

Notes:

- Freshness remains informational only.
- Release readiness and release actions remain warning-only.

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

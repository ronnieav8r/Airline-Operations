# AeroOps Major Scaffolding Macro Plan

Last updated: 2026-06-10

## Summary

This plan covers the remaining major AeroOps scaffolding after the FlightLeg,
release evidence, aircraft, crew assignment, and crew scheduling foundations.
The work should run dependency-first:

1. Auth, roles, and user attribution.
2. Controlled FlightLeg cutover and ReleasePackage.
3. Crew compliance depth.
4. Crew scheduling lifecycle.
5. Crew self-service and crew logistics.

The selected deployment model is single-customer deployments with separate
databases per customer or operator group. `Operator` remains a legal/business
entity inside that deployment, not a SaaS tenant boundary.

## Locked Decisions

- Auth uses local app-owned email/password credentials, HttpOnly DB-backed
  sessions, and operational roles.
- Roles expand to `ADMIN`, `OPS`, `DISPATCH`, `MAINTENANCE`, `CREW`, `SAFETY`,
  and `VIEWER`.
- FlightLeg cutover is controlled: migrate reads and APIs first, then keep
  legacy `Flight` as compatibility/archive until parity is proven.
- `ReleasePackage` is an additive final evidence bundle around existing
  `FlightRelease`; it does not immediately replace `FlightRelease`.
- Crew schedule publishing marks schedule entries published and generates
  linked `CrewSchedule` bridge rows for current planner compatibility.
- Rotation pattern application creates draft `CrewScheduleEntry` rows only.
- `CrewScheduleRequest` handles period-scoped bids/preferences/swaps; existing
  `TimeOffRequest` remains the simple absence workflow.
- Crew compliance uses separate records for certificate/rating, medical,
  training, check, recency, duty, and rest.
- Crew self-service first supports view plus request submission. Crew users do
  not change aircraft assignments.
- Crew logistics first tracks crew location and travel needs, including
  deadhead, ticket, and hotel placeholders.
- Compliance, release, and scheduling policy remains warning-first until auth,
  signatures, and policy enforcement are mature.

## Chain 1: Auth, Roles, And Attribution

Prompts 159-164:

- `159`: Create macro plan docs and update project status.
- `160`: Local auth planning: roles, route protection, session policy, password
  policy, user attribution policy.
- `161`: Auth schema foundation: expand `UserRole`; add password credential
  and session tables.
- `162`: Login/logout foundation: `/login`, logout action, session cookie
  helper, current-user helper, safe local/demo admin credentials.
- `163`: Role and attribution foundation: protect mutation routes/actions and
  attach existing nullable user attribution fields where available.
- `164`: Auth QA: login/logout, role gates, existing pages, existing workflows,
  no public write access.

No SSO, email reset, MFA, signatures, or tenant membership in this chain.

## Chain 2: FlightLeg Cutover And ReleasePackage

Prompts 165-173:

- `165`: FlightLeg cutover planning: inventory remaining legacy `Flight`
  reads/writes, migration order, parity criteria, and rollback.
- `166`: FlightLeg read cutover foundation: move remaining page helpers to
  FlightLeg-primary reads with explicit legacy fallback where still needed.
- `167`: FlightLeg API cutover foundation: move coverage/crew APIs toward
  FlightLeg-native inputs while preserving compatibility aliases.
- `168`: FlightLeg cutover QA: parity diagnostics, route smoke, create/edit
  workflow, coverage APIs.
- `169`: ReleasePackage planning: define package evidence, links, snapshots,
  mutability, and relationship to `FlightRelease`.
- `170`: ReleasePackage additive schema foundation.
- `171`: ReleasePackage read-only preview on FlightLeg detail.
- `172`: Explicit ReleasePackage preview capture action.
- `173`: ReleasePackage QA.

No dropping `Flight`, no hard release blocking, no override workflow, and no
provider integrations in this chain.

## Chain 3: Crew Compliance Foundation

Prompts 174-181:

- `174`: Crew compliance planning: certificate/rating, medical, training,
  check, recency, duty, and rest boundaries.
- `175`: Additive crew compliance schema foundation.
- `176`: Compliance seed/backfill/demo data and health counts.
- `177`: Crew compliance read surfaces on crew detail and planner.
- `178`: Aircraft assignment warning integration.
- `179`: Release readiness warning integration.
- `180`: Crew compliance QA.
- `181`: Compliance docs/status refresh.

No legal duty/rest enforcement algorithm yet. Warnings only.

Prompt 174 planning status: complete. The selected compliance model is
additive and documented in `docs/CREW_COMPLIANCE_PLAN.md`: keep existing
`CrewQualification` for compatibility warnings while adding separate
certificate, medical, training, check, recency, duty, and rest evidence tables.

## Chain 4: Crew Scheduling Lifecycle

Prompts 182-193:

- `182`: Schedule publish/finalize planning.
- `183`: Publish foundation: publish a period, publish draft entries, create
  linked `CrewSchedule` bridge rows, set publisher/current user.
- `184`: Publish QA.
- `185`: Rotation pattern application planning.
- `186`: Pattern application preview.
- `187`: Pattern generate-drafts foundation.
- `188`: Pattern application QA.
- `189`: Crew schedule request workflow planning.
- `190`: Admin request review foundation for `CrewScheduleRequest`.
- `191`: Request-to-draft-entry helper.
- `192`: Crew request workflow QA.
- `193`: Scheduling lifecycle docs/status refresh.

No auto-publishing, silent aircraft assignment creation, or duty/rest hard
enforcement in this chain.

## Chain 5: Crew Self-Service And Logistics

Prompts 194-205:

- `194`: Crew self-service portal planning.
- `195`: Crew portal shell: crew profile, schedule, time off, requests,
  assignments, and compliance warnings.
- `196`: Crew request submission: crew can submit `CrewScheduleRequest` and
  `TimeOffRequest`; no approvals from crew role.
- `197`: Crew portal QA.
- `198`: Crew logistics planning.
- `199`: Logistics schema foundation: location, positioning need, deadhead,
  ticket/hotel placeholders, status, notes.
- `200`: Logistics read surfaces on crew detail, planner, and aircraft
  assignment workflow.
- `201`: Logistics create/edit foundation for ops/admin.
- `202`: Logistics QA.
- `203`: Cross-link polish.
- `204`: Macro scaffolding QA pass.
- `205`: Docs/status/onboarding refresh.

No airline booking integration, hotel provider integration, or expense workflow
in this chain.

## Validation Standard

For every implementation slice:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB prep when schema changes are included.
- Route smoke for `/`, `/operations-control`, `/crew`, `/crew/scheduling`,
  `/aircraft`, `/api/health`, and relevant internal diagnostics.
- Workflow smoke for changed routes/actions.
- Commit and push before continuing.

Runtime QA requiring Docker should be completed when Docker Desktop is
available. If unavailable, record static validation plus runtime QA pending.

## Stop Conditions

- Hard release blocking or override enforcement becomes necessary.
- Legal signature semantics become necessary.
- Provider integrations or file uploads become tempting.
- Destructive legacy `Flight` removal becomes tempting.
- Shared multi-tenant SaaS scoping becomes tempting.
- Duty/rest legal enforcement requires policy interpretation beyond warnings.

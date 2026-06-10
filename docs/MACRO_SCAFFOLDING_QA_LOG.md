# Macro Scaffolding QA Log

Last updated: 2026-06-10

## Prompt 204 Summary

This QA pass reviews the major scaffolding chains completed through Prompt 203:

- Auth, roles, and attribution.
- FlightLeg cutover and ReleasePackage.
- Crew compliance.
- Crew scheduling lifecycle.
- Crew self-service portal.
- Crew logistics.

No new product behavior was added in Prompt 204.

## Static Validation

- `npm run prisma:validate`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.

## Runtime QA Status

DB-backed route/workflow smoke remains pending because Docker Desktop was
unavailable. The local DB prep command failed before Postgres could start:

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

## Chain Status

### Auth, Roles, And Attribution

Status: implemented for local app auth and static validation.

- Local login/logout foundation exists.
- Mutation routes/actions use role gates where implemented in the macro chain.
- Existing nullable attribution fields are populated where workflows already
  support them.

Runtime pending:

- Login/logout browser smoke.
- Role-gate smoke for admin/ops/crew cases.

### FlightLeg Cutover And ReleasePackage

Status: implemented for static validation.

- Main reads have moved toward FlightLeg-primary behavior with compatibility
  fallbacks.
- Coverage/crew APIs preserve compatibility.
- ReleasePackage exists as an additive wrapper around `FlightRelease`.
- Package preview/capture remains explicit and warning-first.

Runtime pending:

- FlightLeg parity diagnostics against a live local DB.
- ReleasePackage capture workflow smoke.

### Crew Compliance

Status: implemented for static validation.

- Additive compliance records exist for certificates, medicals, training,
  checks, recency, duty, and rest.
- Read surfaces and warning integrations are in place.
- No legal duty/rest enforcement algorithm has been added.

Runtime pending:

- Crew detail/planner compliance rendering against seeded/local data.
- Aircraft assignment and release-readiness warning smoke.

### Crew Scheduling Lifecycle

Status: implemented for static validation.

- Period publishing creates linked `CrewSchedule` bridge rows.
- Rotation patterns can preview and generate draft `CrewScheduleEntry` rows.
- Admin request review for `CrewScheduleRequest` is implemented.
- Approved requests can source draft entries.
- `AircraftCrewAssignment` remains operational coverage truth.

Runtime pending:

- Publish idempotency and bridge-row smoke.
- Pattern draft generation smoke.
- Request review and source-linked draft smoke.

### Crew Self-Service Portal

Status: implemented for static validation.

- `/crew/portal` provides linked crew member context.
- Crew users can submit time-off and schedule requests.
- Crew users cannot approve requests, publish schedules, change aircraft
  assignments, or write logistics records.

Runtime pending:

- Linked crew-user portal smoke.
- Crew request submission smoke.

### Crew Logistics

Status: implemented for static validation.

- Additive location and logistics-need schema exists.
- Crew detail, crew planner, and aircraft crew workflow expose read-only
  logistics context.
- Ops/admin users can manage crew-scoped logistics records at
  `/crew/[crewMemberId]/logistics`.
- Cross-links connect crew, aircraft, planner, assignment, and logistics
  surfaces.

Runtime pending:

- Logistics create/edit workflow smoke.
- Logistics read-surface smoke.
- Confirmation that logistics actions do not mutate schedules, assignments,
  release records, or duty/rest records.

## Boundary Confirmation

The macro scaffolding still intentionally excludes:

- hard release blocking,
- legal signatures,
- booking provider integrations,
- file uploads,
- expense workflow,
- automated aircraft assignment creation,
- automatic positioning recommendations,
- hard duty/rest enforcement,
- destructive legacy `Flight` removal,
- shared multi-tenant SaaS scoping.

## Recommended Prompt 205 Focus

Prompt 205 should refresh onboarding/status docs and summarize the current
operational scaffolding for future builder/planner chats. It should not add new
features.

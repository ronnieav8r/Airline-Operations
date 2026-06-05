# Builder Prompt 05: Authority And Operational Control Foundation

You are building the fifth small slice of AeroOps Center.

Do not build the full app yet. This prompt is only for the first compliance-ready schema extension around operating authority and operational control.

## Context

Read these files first:

- `README.md`
- `docs/SCHEMA_DECISIONS.md`
- `docs/COMPLIANCE_ROADMAP.md`
- `prisma/schema.prisma`
- `docs/schema.dbml`

The existing app has a v1 `Flight` model. Treat it as the current stand-in for a future `FlightLeg` anchor. Do not rename `Flight` in this slice unless the planner explicitly approves that migration.

## Goal

Add the minimum authority and operational-control foundation needed for Part 91, Part 91K, and Part 135-style growth.

This slice should let each flight identify:

- which operator owns the operating context
- which authority/rule set applies
- which authority revision was in effect
- who or what entity had operational control
- whether a release/control record exists for the flight

## Safety Constraints

This is the first schema slice after the app was connected to a live Render database. Treat it as production-adjacent even if the current data is demo data.

Hard rules:

- Make this migration additive.
- Do not add required fields to existing tables unless they have safe defaults and do not break existing rows.
- Do not rename `Flight`.
- Do not drop tables, columns, enums, or indexes.
- Do not run destructive seed logic against Render production data.
- Do not run `npm run prisma:seed` against Render unless the planner explicitly asks.
- Do not use `prisma migrate reset`.
- Do not use `prisma db push` for this slice.
- Create a Prisma migration file, but do not apply it to production unless explicitly instructed.

Seed changes must be idempotent and demo-safe. Prefer `upsert` or stable unique fields over delete/recreate behavior for any new authority/control seed data.

## Required Schema Direction

Add conservative Prisma models for:

- `Operator`
- `OperatingAuthority`
- `AuthorityRevision`
- `Manual`
- `ManualRevision`
- `OperationalControlRecord`
- `FlightRelease`

Suggested enum:

```text
OperatingPart: PART_91, PART_91K, PART_135
AuthorityStatus: DRAFT, ACTIVE, SUPERSEDED, RETIRED
ReleaseStatus: PLANNED, RELEASED, CANCELLED, VOIDED
```

Use names that fit the existing Prisma style if there is a better local pattern.

## Relationship Guidance

Minimum relationships:

```text
Operator -> OperatingAuthority
OperatingAuthority -> AuthorityRevision
OperatingAuthority -> Manual
Manual -> ManualRevision
Flight -> OperationalControlRecord
OperationalControlRecord -> Operator
OperationalControlRecord -> OperatingAuthority
OperationalControlRecord -> AuthorityRevision
OperationalControlRecord -> FlightRelease
```

Keep `Flight` as the current relation target for this slice.

Prefer optional relations from existing records into new tables so existing flights continue to build and deploy before any seed/backfill runs.

## Required Fields

`Operator` should include:

- name
- certificate or internal code if available
- active flag

`OperatingAuthority` should include:

- operator relation
- operating part
- display name
- active/current status

`AuthorityRevision` should include:

- operating authority relation
- revision label or number
- effective start
- effective end nullable
- status

`Manual` and `ManualRevision` should include enough fields to track current documents and revision dates without file upload support.

`OperationalControlRecord` should include:

- flight relation
- operator relation
- operating authority relation
- authority revision relation
- controlling entity/name
- control notes
- created by user nullable
- created timestamp

`FlightRelease` should include:

- operational control record relation
- release status
- released by user nullable
- released at nullable
- release notes nullable

## Seed Data

Update seed data with one operator and at least two authorities:

- Part 91
- Part 135

Attach authority/control/release records to at least a few seeded flights so dashboard/API inspection can prove the relationships work.

Important seed requirements:

- Preserve the current demo seed shape unless it must change for the new models.
- Do not make the seed script more destructive than it already is.
- If modifying existing cleanup order, keep foreign-key dependencies valid.
- Any new authority/control seed records should be created with stable unique keys and `upsert` where practical.
- The builder may verify seed locally only if a local/test `DATABASE_URL` is available. Do not require live Render seeding for completion.

## DBML

Update:

- `docs/schema.dbml`
- `docs/schema.visual.dbml`

Keep the DBML format compatible with dbdiagram.io and consistent with the existing quoted table/column style.

## Do Not Do Yet

- Do not rename `Flight` to `FlightLeg`.
- Do not build trip/mission tables yet.
- Do not build manifest, weight-and-balance, or flight-locating tables yet.
- Do not build maintenance or SMS tables yet.
- Do not add file uploads for manuals.
- Do not build full CRUD screens.
- Do not add auth enforcement unless already required by local code.

## Acceptance Criteria

- `npx prisma validate` passes.
- Prisma migration is created.
- Seed script is updated in a way that is type-safe and logically runnable.
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Existing dashboard and crew-resolution routes still work.
- DBML docs include the new tables and relationships.
- The migration is additive and does not drop existing production data.
- Final report clearly states whether seed was actually run, and against what database context.

## Final Response Expected From Builder

Report:

- files created/changed
- commands run
- validation/build/typecheck results
- migration name
- assumptions made
- blockers requiring planner/user decision

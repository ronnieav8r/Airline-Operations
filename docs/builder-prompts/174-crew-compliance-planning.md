# Prompt 174: Crew Compliance Planning

## Summary

Plan the deeper crew compliance foundation before adding schema. The selected
direction is additive: keep existing `CrewQualification` for current warning
surfaces and add richer compliance record types beside it in Prompt 175.

Prompt 174 is planning-only. It does not add schema, UI, workflows, release
blocking, duty/rest enforcement, imports, file uploads, provider integrations,
or legal signature behavior.

## Current Boundary

The current app supports:

- `CrewMember` identity, base, employment status, and broad duty status.
- `CrewQualification` by aircraft type and seat role.
- Aircraft-block crew coverage through `AircraftCrewAssignment`.
- FlightLeg crew evidence snapshots through `CrewLegAssignment`.
- Warning-only qualification checks in crew, aircraft, planner, and assignment
  surfaces.

This is useful for development, but it is too shallow for real compliance
because certificates, medicals, training, checks, recency, duty, and rest have
different effective dates, evidence, rules, and audit needs.

## Selected Compliance Record Boundaries

Prompt 175 should add separate additive records for:

- `CrewCertificate`: certificate/rating/endorsement style records, with type,
  certificate number, issuing authority, issue/expiry dates, aircraft category
  or type where relevant, and notes.
- `CrewMedical`: medical certificate/class records with issue/expiry dates,
  limitations, and notes.
- `CrewTrainingEvent`: training completion records with program/module,
  aircraft type where relevant, completion/expiry dates, result, instructor,
  and notes.
- `CrewCheckEvent`: proficiency, competency, line, route, instrument, or other
  check records with check type, date, expiry, result, evaluator, and notes.
- `CrewRecencyEvent`: recent-experience evidence such as landings, approaches,
  route/area exposure, or other rolling-window events.
- `CrewDutyPeriod`: duty-period history or planned duty evidence with start/end,
  status, source, and notes.
- `CrewRestPeriod`: rest-period history or planned rest evidence with start/end,
  status, source, and notes.

## Relationship To Existing Records

- `CrewQualification` remains the current compatibility warning row for
  aircraft type plus seat role.
- New compliance records are source evidence and history; they do not replace
  `AircraftCrewAssignment`.
- `AircraftCrewAssignment` remains the operational coverage source.
- `CrewLegAssignment` remains FlightLeg snapshot/evidence.
- `CrewSchedule` and `CrewScheduleEntry` remain availability/planning context.
- Release readiness should consume these records as warnings only until a later
  policy slice defines mature enforcement.

## Prompt 175 Target

Implement additive schema only:

- Add enums for certificate, medical, training, check, recency, duty, rest,
  record status, and result/status fields as needed.
- Add the seven compliance models listed above.
- Link records to `CrewMember`.
- Add nullable user attribution fields where useful, such as `createdById`,
  `verifiedById`, or `recordedById`, but do not implement signatures.
- Add indexes for crew/date/status/expiry lookups.
- Add relation arrays on `CrewMember` and `User`.
- Update current/planning DBML docs.
- Update `/api/health` counts.

Prompt 175 must not add UI, CRUD workflows, release blocking, duty/rest legal
enforcement, file uploads, provider integrations, or import execution.

## Prompt 176 Target

Seed/backfill demo compliance data:

- Add safe local/demo seed rows for each new compliance table.
- Use conservative dates so the app has a mix of current, expiring, and expired
  records for future warning surfaces.
- Keep seed idempotent.
- Do not run broad seed against Render unless explicitly approved.

## Prompt 177 Target

Add read-only compliance surfaces:

- Crew detail: grouped compliance panel for certificates, medicals, training,
  checks, recency, duty, and rest.
- Crew planner: compact compliance warning summary.
- No mutations.

## Prompt 178 Target

Add warning-only aircraft assignment integration:

- Show richer compliance warnings on `/aircraft/[aircraftId]/crew`.
- Do not block assignment saves.
- Do not replace existing `CrewQualification` checks until parity is proven.

## Prompt 179 Target

Add warning-only release readiness integration:

- Surface crew compliance warnings on FlightLeg detail readiness.
- Keep release actions available.
- Do not hard-block release.

## Prompt 180 Target

QA the compliance chain:

- Validate schema, seed, read surfaces, assignment warnings, and release
  readiness warnings.
- Confirm no workflow changed from warning-first to hard-blocking.

## Assumptions

- Compliance recordkeeping is historical and effective-dated.
- No legal duty/rest calculation engine is implemented in this chain.
- Auth attribution is operational accountability, not legal signature.
- File attachments and provider verification remain deferred.
- Imported legacy compliance records remain deferred to the import roadmap.


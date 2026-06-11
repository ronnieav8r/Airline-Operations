# Crew Compliance Plan

Last updated: 2026-06-11

## Current Status Note

Crew Compliance is backend MVP-complete for admin-managed evidence and
warning-only surfaces. Use `docs/CREW_COMPLIANCE_MVP_STATUS.md` and
`docs/BACKEND_MVP_FINAL_SMOKE_QA.md` as newer truth if older sections in this
file mention Docker/runtime QA pending.

## Summary

Crew compliance should become a first-class evidence area inside AeroOps. The
current `CrewQualification` table is intentionally shallow and supports current
warning surfaces, but it does not represent the full set of records needed for
certificate/rating, medical, training, check, recency, duty, and rest context.

The selected direction is additive. Keep the current table and add deeper
record types beside it.

## Source-Of-Truth Boundaries

Crew compliance answers:

```text
What evidence exists that this crew member is eligible, current, trained,
checked, recent, and rested enough for the planned operation?
```

Aircraft crew assignment answers:

```text
Who is actually assigned to this aircraft block?
```

Scheduling answers:

```text
Who appears available and where?
```

These should stay separate:

- `AircraftCrewAssignment` remains operational staffing truth.
- `CrewSchedule` and `CrewScheduleEntry` remain planning/availability context.
- `CrewLegAssignment` remains FlightLeg snapshot/evidence.
- New compliance records become eligibility evidence and warning inputs.

## Current Schema Support

Current support:

- `CrewMember`: identity, employment status, base, broad duty status.
- `CrewQualification`: aircraft type plus seat role, issued/expiry dates.
- `CrewSchedule` / `CrewScheduleEntry`: planned availability context.
- `TimeOffRequest`: absence context.
- `AircraftCrewAssignment`: actual aircraft-block staffing.
- `CrewLegAssignment`: FlightLeg snapshot/evidence.

Current gaps:

- No separate certificate/rating records.
- No medical certificate records.
- No training program or module completion records.
- No proficiency, competency, line, route, or instrument check records.
- No recency ledger/events.
- No duty-period history.
- No rest-period history.
- No attachment/file evidence.
- No legal signature semantics.
- No duty/rest legality engine.

## Additive Compliance Records

Prompt 175 should add these tables:

- `CrewCertificate`: certificates, ratings, endorsements, and related
  authority/effective-date evidence.
- `CrewMedical`: medical certificate/class records and limitations.
- `CrewTrainingEvent`: training program/module completion evidence.
- `CrewCheckEvent`: checkride, proficiency, competency, line, route, or
  instrument check evidence.
- `CrewRecencyEvent`: rolling-window experience evidence such as landings,
  approaches, route/area exposure, or operating experience events.
- `CrewDutyPeriod`: duty-period history or planned duty evidence.
- `CrewRestPeriod`: rest-period history or planned rest evidence.

Each record should favor history over overwrite and include enough fields for:

- crew member lookup,
- status/currentness,
- issue/completion/start dates,
- expiry/end dates where applicable,
- source or notes,
- future user attribution,
- future import/source references.

## Warning-First Policy

Compliance warnings should remain warning-only through this chain:

- Missing certificate or rating: warn.
- Expired certificate, medical, training, check, or recency evidence: warn.
- Missing duty/rest evidence: warn.
- Duty/rest conflict candidate: warn.

Do not hard-block aircraft assignment saves or FlightRelease actions until a
later release/auth/signature policy slice is decision-complete.

## Future Read Surfaces

After schema and seed:

- Crew detail should show grouped compliance history.
- Crew planner should show compact compliance health/warnings.
- Aircraft crew assignment should surface compliance warnings while saving
  remains allowed.
- FlightLeg release readiness should include crew compliance warnings.

## Deferred

- Legal duty/rest enforcement algorithm.
- File uploads for certificate or training documents.
- Provider/FAA verification integrations.
- Electronic signatures.
- Crew self-service compliance uploads.
- Import execution for old compliance records.
- Hard release blocking.

## Next Chain

```text
Prompt 175: Additive crew compliance schema foundation
Prompt 176: Compliance seed/backfill/demo data and health counts
Prompt 177: Crew compliance read surfaces on crew detail and planner
Prompt 178: Aircraft assignment warning integration
Prompt 179: Release readiness warning integration
Prompt 180: Crew compliance QA
Prompt 181: Compliance docs/status refresh
```

Prompt 175 implementation status: complete. The schema foundation adds the
seven additive compliance evidence tables, health counts, migration, and DBML
updates only. Demo data, read surfaces, assignment warnings, and
release-readiness warnings remain in later prompts.

Prompt 176 implementation status: complete. Demo seed/backfill support creates
representative compliance rows for future warnings and read surfaces, without
adding UI or changing assignment/release behavior. Static validation and gated
script skip-path checks passed; DB-backed seed/backfill smoke remains pending
because Docker Desktop was unavailable.

Prompt 177 implementation status: complete. Crew detail and crew planner now
show read-only compliance evidence and compact warning summaries without adding
writes or enforcement. Static validation passed; runtime route/browser smoke
remains pending because Docker Desktop was unavailable.

Prompt 178 implementation status: complete. Aircraft crew assignment now
surfaces richer compliance warnings during assignment review without adding save
blockers. Static validation passed; workflow/browser smoke remains pending
because Docker Desktop was unavailable.

Prompt 179 implementation status: complete. FlightLeg release readiness now
includes crew compliance warnings as warning-only readiness signals. Static
validation passed; route/browser and snapshot smoke remain pending because
Docker Desktop was unavailable.

Prompt 180 QA status: complete for static validation. The crew compliance chain
passes Prisma validation, typecheck, lint, and build. DB-backed runtime checks
remain pending because Docker Desktop was unavailable.

Prompt 181 docs/status refresh: complete. The crew compliance foundation chain
is closed from a scaffolding standpoint. Runtime DB/browser QA remains pending
until Docker is available, but the next macro build step can move to crew
scheduling lifecycle planning.

Prompt 207 duty/rest calculator planning is complete. Duty/rest findings should
remain operational warnings inside FlightLeg release readiness first. The first
calculator should use existing duty/rest policy settings, `CrewDutyPeriod`,
`CrewRestPeriod`, FlightLeg schedule, and crew assignment context. It should not
be treated as legal enforcement, should not block release or assignment actions,
and should report missing outside flying, reserve/standby detail,
transportation classification, reduced-rest compensation, and actual
flight-time data as missing-input or deferred findings.

Prompt 208 duty/rest warning calculator foundation is complete. FlightLeg
release readiness now includes one warning-only duty/rest item with detailed
subfindings stored in readiness item details and captured by existing preview
and release-attempt snapshots. The calculator remains an operational warning
surface, not a legal enforcement engine.

Prompt 230 admin workflow planning is complete. The next compliance chain should
add `/crew/[crewMemberId]/compliance` as an ops/admin management surface for
existing compliance tables. Implementation should proceed in narrow slices:
certificate/medical, training/check/recency, duty/rest, QA, and docs refresh.
Records remain evidence and warning inputs only; no hard enforcement,
signatures, uploads, provider verification, or crew self-service compliance
submission should be added.

Prompt 231 implementation is complete. `/crew/[crewMemberId]/compliance` now
supports admin/ops create, update, review, and void workflows for certificates
and medicals only. Training, check, recency, duty, and rest admin workflows
remain in later slices.

Prompt 232 implementation is complete. The same compliance route now supports
training, check, and recency create, update, review, and void workflows. Duty
and rest admin workflows remain in Prompt 233.

Prompt 233 implementation is complete. The same compliance route now supports
duty and rest create, update, review, and cancel workflows. Duty/rest remains
warning-only; this does not add regulatory hard enforcement.

Prompt 234 QA is complete. Local static validation, workflow smoke, route
smoke, and browser smoke passed for the compliance admin workflow chain.

Prompt 235 docs/status refresh is complete. Crew compliance backend is
MVP-complete for warning-only development use; see
`docs/CREW_COMPLIANCE_MVP_STATUS.md`.

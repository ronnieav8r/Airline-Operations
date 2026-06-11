# Backend MVP Completion Plan

Last updated: 2026-06-11

## Summary

This plan moves AeroOps from broad backend scaffolding to a mostly complete MVP
backend before major frontend/UI polish. Work remains backend-first,
warning-first, and operationally safe. Legacy `Flight` remains
compatibility/archive until destructive retirement is separately planned.

Execution model:

- Work in small sequential prompts starting at Prompt 217.
- Commit and push after every slice.
- Use parallel/subagent work only for docs inventory or QA review with disjoint
  file scopes.
- Stop if a slice requires hard release blocking, legal signatures, provider
  integrations, file uploads, destructive legacy removal, or ambiguous
  regulatory/product policy.

## Batch 1: Backend MVP QA Baseline And FlightLeg Cutover

- `217`: Backend MVP macro plan docs.
- `218`: Backend MVP smoke harness planning.
- `219`: Backend MVP smoke harness foundation.
- `220`: Backend MVP QA pass.
- `221`: FlightLeg legacy dependency inventory.
- `222`: FlightLeg consumer cutover foundation 2.
- `223`: FlightLeg cutover QA and archive policy.

Acceptance for this batch:

- The smoke harness exercises auth/roles, FlightLeg create/edit, release
  evidence, ReleasePackage, scheduling, crew portal, logistics, and duty/rest
  readiness.
- Safe internal consumers prefer `FlightLeg.id` where bridges exist.
- Legacy `Flight` is documented as compatibility/archive, not active
  operational truth.

Prompt 218 planning is documented in `docs/BACKEND_MVP_SMOKE_HARNESS_PLAN.md`.
Prompt 219 should extend the existing smoke scripts and Playwright coverage; it
should not introduce a separate framework or production bypass.

Prompt 219 is implemented. The expanded smoke harness now covers the main
backend-MVP route, workflow, browser, release evidence, ReleasePackage,
scheduling, crew portal, logistics, and duty/rest readiness paths.

Prompt 220 QA passed and is recorded in `docs/BACKEND_MVP_QA_LOG.md`. No code
fixes were required. The next batch step is a legacy `Flight` dependency
inventory before further FlightLeg cutover.

Prompt 221 is complete. Remaining legacy `Flight` dependencies are inventoried
in `docs/FLIGHTLEG_LEGACY_DEPENDENCY_INVENTORY.md`. Prompt 222 should only
cut over the remaining Flight-first internal read consumers; compatibility and
archive dependencies remain in place.

Prompt 222 is complete. Remaining safe internal consumers now prefer
FlightLeg-primary reads while preserving legacy fallback and API compatibility.
Prompt 223 should QA the cutover and document the MVP archive policy.

Prompt 223 is complete. FlightLeg cutover QA passed, and legacy `Flight` is now
documented as compatibility/archive for backend MVP in
`docs/FLIGHTLEG_LEGACY_ARCHIVE_POLICY.md`.

Prompt 224 is complete. The MVP release lifecycle is planned in
`docs/MVP_RELEASE_LIFECYCLE_PLAN.md`. Prompt 225 should tighten release action
state alignment, attribution, readiness snapshot metadata, and audit metadata
while keeping release warning-only.

Prompt 225 is complete. Release action snapshots/audit events now include
actor user and role metadata, and release actions remain warning-only.

Prompt 226 is complete as planning. Final ReleasePackage capture should be an
explicit `ADMIN` or `OPS` action that creates a new `FINALIZED` package while
leaving preview packages and `FlightRelease.status` unchanged.

Prompt 227 is complete. ReleasePackage final capture now exists as an explicit
backend workflow and preserves warning-only release behavior.

Prompt 228 is complete. Release backend QA passed locally across static checks,
workflow smoke, route smoke, and browser smoke.

Prompt 229 is complete. Release docs now mark the warning-only release backend
as MVP-complete and keep post-MVP release items clearly deferred.

## Batch 2: Release Backend Completion

- `224`: MVP release lifecycle planning.
- `225`: Release lifecycle foundation.
- `226`: ReleasePackage final capture planning.
- `227`: ReleasePackage final capture foundation.
- `228`: Release backend QA.
- `229`: Release backend docs refresh.

Acceptance for this batch:

- `FlightRelease` remains the release decision record.
- `ReleasePackage` is the evidence package wrapper.
- Release actions are warning-only and audit-attributed.
- Preview/final package capture behavior is explicit and tested.

## Batch 3: Crew Compliance Admin Workflows

- `230`: Crew compliance admin workflow planning.
- `231`: Certificate and medical admin foundation.
- `232`: Training, check, and recency admin foundation.
- `233`: Duty and rest admin foundation.
- `234`: Crew compliance warning integration QA.
- `235`: Crew compliance docs refresh.

Acceptance for this batch:

- Ops/admin users can manage MVP crew compliance records.
- Compliance warnings remain visible in crew detail, crew planner, aircraft crew
  assignment, and release readiness.
- No legal enforcement, signature semantics, or hard blocking is added.

## Batch 4: Duty/Rest Calculator QA And Refinement

- `236`: Duty/rest scenario QA planning.
- `237`: Duty/rest scenario seed foundation.
- `238`: Duty/rest diagnostic foundation.
- `239`: Duty/rest calculator refinement.
- `240`: Duty/rest snapshot QA.
- `241`: Duty/rest docs refresh.

Acceptance for this batch:

- Seeded Part 91 and Part 135-style scenarios cover pass, warning,
  missing-input, and deferred outcomes.
- Duty/rest findings persist into readiness snapshots.
- Missing outside flying, transportation classification, reserve/standby,
  reduced-rest debt, actual flight-time, and hard enforcement remain explicit
  deferrals.

## Batch 5: Crew Scheduling Runtime Hardening

- `242`: Crew scheduling runtime QA planning.
- `243`: Schedule period and publishing QA.
- `244`: Rotation pattern QA and fixes.
- `245`: Crew request and time-off QA.
- `246`: Crew portal backend QA.
- `247`: Crew scheduling docs refresh.

Acceptance for this batch:

- Schedule periods, draft entries, pattern generation, publishing, requests,
  time off, and crew portal behavior are runtime-tested.
- Publishing creates linked `CrewSchedule` bridge rows without mutating aircraft
  assignments.
- Crew users can submit allowed requests only.

## Batch 6: Logistics Hardening

- `248`: Logistics runtime QA planning.
- `249`: Crew logistics workflow QA.
- `250`: Logistics workbench QA and fixes.
- `251`: Logistics docs refresh.

Acceptance for this batch:

- Manual logistics workflows are runtime-tested for location records and travel
  needs.
- `/crew/logistics` filters, grouping, and cross-links are validated.
- Provider integrations, bookings, expenses, and automatic positioning remain
  deferred.

## Batch 7: Backend MVP Closure

- `252`: Backend MVP final smoke pass.
- `253`: Backend MVP gap review.
- `254`: Backend MVP status cleanup.
- `255`: Frontend readiness planning.

Acceptance for this batch:

- Backend MVP gaps are either fixed or explicitly deferred as post-MVP.
- Project docs clearly identify stable backend contracts for frontend work.
- The team can shift to frontend/UI polish without backend ambiguity.

## Global Validation Standard

Every implementation slice must run:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB prep when needed: `npm run db:local:up`,
  `npm run db:local:migrate`, `npm run db:local:seed`
- `npm run smoke:app`
- `npm run smoke:browser`
- Feature-specific workflow smoke for the changed area.

## Out Of Scope For Backend MVP

- Legacy import execution.
- ADS-B/provider integrations.
- Booking integrations.
- File uploads.
- Expense workflow.
- Formal legal signatures.
- Hard release blocking.
- Destructive legacy `Flight` removal.

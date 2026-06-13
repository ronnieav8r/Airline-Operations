# AeroOps Docs Map

Last updated: 2026-06-13

## Start Here

Use these files first. They are the current source of truth for new builder or
planner chats:

- `docs/BUILDER_ONBOARDING.md`: quick orientation for new work.
- `docs/CURRENT_HANDOFF.md`: current handoff summary for the next builder.
- `docs/PROJECT_STATUS.md`: current status plus long running history.
- `docs/BACKEND_MVP_STATE.md`: stable backend contracts after backend MVP.
- `docs/FRONTEND_READINESS_PLAN.md`: current frontend/UI handoff plan.
- `docs/SMOKE_TESTING.md`: command-driven local smoke test harness.
- `docs/SCHEMA_DECISIONS.md`: current schema and data-boundary decisions.
- `docs/DOCUMENTATION_AUDIT.md`: documentation cleanup notes and stale-doc
  handling.

## Current Backend MVP Evidence

- `docs/BACKEND_MVP_FINAL_SMOKE_QA.md`: final backend MVP smoke pass.
- `docs/BACKEND_MVP_GAP_REVIEW.md`: remaining backend gaps and post-MVP
  deferrals.
- `docs/BACKEND_MVP_COMPLETION_PLAN.md`: completed backend MVP macro chain.

## Current Domain Source Docs

- FlightLeg/cutover:
  - `docs/FLIGHTLEG_CUTOVER_PLAN.md`
  - `docs/FLIGHTLEG_LEGACY_ARCHIVE_POLICY.md`
  - `docs/FLIGHTLEG_COVERAGE_RESPONSE_CONTRACT.md`
- Release and release package:
  - `docs/MVP_RELEASE_LIFECYCLE_PLAN.md`
  - `docs/RELEASE_BACKEND_MVP_STATUS.md`
  - `docs/RELEASEPACKAGE_PLAN.md`
  - `docs/RELEASE_BLOCKING_POLICY.md`
  - `docs/RELEASE_SNAPSHOT_POLICY.md`
- Release evidence and locating:
  - `docs/RELEASE_EVIDENCE_SCHEMA_DECISIONS.md`
  - `docs/RELEASE_EVIDENCE_WORKFLOW_REVIEW.md`
  - `docs/RELEASE_EVIDENCE_MUTATION_PLAN.md`
  - `docs/FLIGHT_LOCATING_POSITION_HISTORY_PLAN.md`
- Aircraft and airworthiness:
  - `docs/AIRWORTHINESS_SCHEMA_DECISIONS.md`
  - `docs/AIRWORTHINESS_RELEASE_POLICY.md`
  - `docs/AIRWORTHINESS_MUTATION_PLAN.md`
  - `docs/FUEL_LEDGER_RELEASE_READINESS.md`
- Crew:
  - `docs/CREW_COMPLIANCE_PLAN.md`
  - `docs/CREW_COMPLIANCE_MVP_STATUS.md`
  - `docs/CREW_SCHEDULING_SYSTEM_ARCHITECTURE.md`
  - `docs/CREW_SCHEDULING_MODULE_PLAN.md`
  - `docs/CREW_SCHEDULING_MVP_STATUS.md`
  - `docs/CREW_SELF_SERVICE_PORTAL_PLAN.md`
  - `docs/CREW_LOGISTICS_PLAN.md`
  - `docs/CREW_LOGISTICS_MVP_STATUS.md`
- Duty/rest:
  - `docs/DUTY_REST_REGULATORY_RESEARCH.md`
  - `docs/DUTY_REST_POLICY_SETTINGS.md`
  - `docs/DUTY_REST_MVP_STATUS.md`
  - `docs/DUTY_REST_SCENARIO_QA_PLAN.md`
- External tracking / ADS-B:
  - `docs/ADSB_DATA_SOURCE_OPTIONS_REPORT.md`
  - `docs/EXTERNAL_TRACKING_INTEGRATION_PLAN.md`
- Imports:
  - `docs/LEGACY_RECORD_IMPORT_PLAN.md`
  - `docs/LEGACY_IMPORT_STAGING_SCHEMA_PLAN.md`
  - `docs/LEGACY_IMPORT_STAGING_DRY_RUN_PLAN.md`
  - `docs/IMPORT_BATCH_METADATA_WORKFLOW_PLAN.md`

## Schema References

- `docs/schema.current.dbml`: implemented schema snapshot.
- `docs/schema.planning.flightleg.dbml`: long-term FlightLeg planning schema.
- `docs/schema.dbml` and `docs/schema.visual.dbml`: older/generated DBML
  references; use only when needed.

## Historical And Audit Docs

- `docs/builder-prompts/`: append-only prompt history. Do not treat old prompt
  docs as current status if newer MVP docs supersede them.
- `docs/*_QA_LOG.md`: audit logs. Older entries may mention Docker/runtime QA
  pending; check current MVP status docs before treating those as active gaps.
- `docs/MAJOR_SCAFFOLDING_MACRO_PLAN.md` and
  `docs/MACRO_SCAFFOLDING_QA_LOG.md`: macro implementation history.
- `docs/airline.ops.research.report.md`: broad regulatory/product research
  reference.

## Stale-Note Rule

Some older docs intentionally preserve historical notes such as "Docker Desktop
was unavailable" or "runtime QA pending." Those notes are historical if a newer
MVP status, QA log, or backend smoke document says the area passed later QA.

Current highest-priority truth order:

1. `docs/BACKEND_MVP_STATE.md`
2. Current domain MVP status docs, such as `CREW_SCHEDULING_MVP_STATUS.md`
3. Current QA logs, such as `BACKEND_MVP_FINAL_SMOKE_QA.md`
4. Domain planning docs
5. Historical builder prompts and older QA entries

## Current Next Work

Frontend/UI polish is active. Recent completed work includes compact dashboard
passes, FlightLeg drawer/object-action refinement, fuel ledger/release fuel
readiness, and dashboard drawer summary cleanup. Start with
`docs/CURRENT_HANDOFF.md` before selecting the next UI slice.

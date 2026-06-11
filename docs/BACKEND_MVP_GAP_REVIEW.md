# Backend MVP Gap Review

Last updated: 2026-06-11

## Result

No backend MVP blockers were found after the Prompt 252 final smoke pass.

The backend is suitable to move into final status cleanup and frontend
readiness planning. Remaining gaps are post-MVP or later-policy work unless a
new product decision changes the boundary.

## Evidence

- `docs/BACKEND_MVP_FINAL_SMOKE_QA.md` records passing static, database,
  workflow, route, and browser smoke checks.
- Auth/role gates passed for all seeded smoke-test user levels.
- FlightLeg workflows, release evidence, ReleasePackage capture, crew
  compliance admin workflows, duty/rest warning snapshots, crew scheduling,
  crew portal, and crew logistics all passed focused workflow smoke.

## MVP Backend Capabilities Ready

- Local auth with role-gated mutation workflows and smoke-test users.
- FlightLeg-primary backend workflows with legacy `Flight` compatibility kept
  intact.
- Release evidence workflows and warning-only release lifecycle.
- ReleasePackage preview/final capture around existing `FlightRelease`.
- Crew compliance admin record management for certificates, medicals,
  training, checks, recency, duty, and rest.
- Duty/rest warning calculator with scenario seed and snapshot persistence.
- Crew scheduling periods, rotation pattern draft generation, publishing,
  requests, time off, and crew portal submission flows.
- Manual crew logistics location/travel-need workflows and central workbench.

## Not MVP Blockers

- Legacy `Flight` still exists. This is intentional compatibility/archive, not
  an MVP blocker.
- Release behavior remains warning-only. Hard blocking and legal signatures are
  intentionally deferred.
- Duty/rest remains warning-first. The first calculator is not a legal
  enforcement engine.
- Crew scheduling does not automatically create aircraft assignments.
  `AircraftCrewAssignment` remains the operational staffing source of truth.
- Crew logistics does not book travel or recommend positioning automatically.
- Import staging and ADS-B/provider integrations remain lower priority.

## Post-MVP Backend Gaps

- Destructive legacy `Flight` retirement plan and migration.
- Hard release blocking policy and override workflow.
- Formal legal signatures and signoff semantics.
- ReleasePackage final legal/archive package hardening.
- Full duty/rest legal enforcement engine, including outside commercial flying,
  reserve/standby nuance, transportation classification, reduced-rest debt, and
  actual flight-time inputs.
- Provider integrations for ADS-B, airline tickets, hotel booking, and ground
  transportation.
- File uploads and document attachment handling.
- Expense/payment workflows.
- Legacy record import execution.
- Deeper crew self-service features beyond request submission.

## Recommendation

Proceed with:

1. Prompt 254: Backend MVP status cleanup.
2. Prompt 255: Frontend readiness planning.
3. Then shift major effort to frontend/UI polish using the backend contracts
   documented during Prompt 255.

# Prompt 181: Crew Compliance Docs/Status Refresh

## Summary

Prompt 181 closes the crew compliance foundation chain and updates onboarding
status for the next macro step.

This is docs/status only. No schema, UI, seed, workflow, release, assignment,
auth, import, provider, file upload, signature, or duty/rest enforcement
behavior is added.

## Completed Chain

Prompts 174-180 completed the crew compliance foundation:

- Planned the additive compliance boundary.
- Added seven compliance evidence tables.
- Added demo seed/backfill support.
- Added read-only crew detail and planner surfaces.
- Added warning-only aircraft assignment context.
- Added warning-only release readiness context.
- Documented static QA.

## Current Boundary

- `CrewQualification` remains current compatibility warning data.
- `AircraftCrewAssignment` remains operational aircraft staffing truth.
- `CrewLegAssignment` remains FlightLeg snapshot/evidence.
- Compliance records are evidence/warning inputs only.
- Release actions remain available.
- Duty/rest legal enforcement remains deferred.

## Validation

Prompt 181 did not change app code. Prompt 180 static validation passed:

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Runtime DB/browser QA remains pending because Docker Desktop was unavailable.

## Next Macro Step

Proceed to crew scheduling lifecycle:

```text
Prompt 182: Schedule publish/finalize planning
```

The next chain should plan and then implement schedule period publishing,
rotation pattern draft generation, and broader `CrewScheduleRequest` review,
without automatic aircraft assignment mutation or duty/rest hard enforcement.


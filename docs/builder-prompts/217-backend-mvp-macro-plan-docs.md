# Prompt 217: Backend MVP Macro Plan Docs

## Summary

Create the backend-MVP completion roadmap and update onboarding/status docs so
future builder slices prioritize backend completion before frontend UI polish.

## Implemented Scope

- Added `docs/BACKEND_MVP_COMPLETION_PLAN.md`.
- Updated project status to make the backend-MVP chain the active next track.
- Updated builder onboarding required reading and next safe planning choices.

## Boundaries

- Docs/status only.
- No app code changes.
- No schema changes.
- No smoke harness implementation yet.
- No release, scheduling, compliance, logistics, or FlightLeg behavior changes.

## Next Slice

Prompt 218 should plan the Backend MVP smoke harness. It should cover auth and
role gates, FlightLeg create/edit, release evidence, ReleasePackage,
scheduling, crew portal, logistics, and duty/rest readiness.

## Validation

- `git diff --check`

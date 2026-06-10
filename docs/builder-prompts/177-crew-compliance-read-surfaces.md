# Prompt 177: Crew Compliance Read Surfaces

## Summary

Prompt 177 exposes the new crew compliance evidence as read-only context on
crew detail and crew scheduling planner surfaces.

No schema, seed, CRUD workflow, assignment mutation, release mutation,
release blocking, duty/rest legal enforcement, imports, file uploads, provider
integrations, or signature behavior is included.

## Implemented Scope

- Crew detail query now loads certificate, medical, training, check, recency,
  duty, and rest evidence.
- Crew detail page now shows:
  - Compliance warning summary.
  - Grouped compliance records.
  - Clear warning-only boundary text.
- Crew planner query now loads compact compliance evidence counts/warnings.
- Crew planner now shows:
  - Summary count for crew needing compliance review.
  - Per-crew compliance warning card.
- Availability warnings now include a general crew compliance review warning
  when compliance evidence needs review.

## Boundaries

- Existing `CrewQualification` remains visible and unchanged.
- Aircraft assignment save behavior is unchanged.
- Release readiness behavior is unchanged.
- No duty/rest legality calculation was added.
- No compliance records can be created or edited from these pages.

## Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Runtime route/browser smoke is pending. Docker Desktop was unavailable, and the
local database start command could not connect to the Docker Desktop Linux
engine.

## Prompt 178 Target

Add richer warning-only compliance context to the aircraft crew assignment
workflow at `/aircraft/[aircraftId]/crew`. Do not block saves.

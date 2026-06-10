# Prompt 178: Aircraft Assignment Compliance Warning Integration

## Summary

Prompt 178 adds richer crew compliance warning context to the aircraft crew
assignment workflow at `/aircraft/[aircraftId]/crew`.

The workflow remains warning-only. Compliance warnings do not block create,
edit, relieve, or end assignment actions.

## Implemented Scope

- Aircraft crew workflow query now loads compact certificate, medical,
  training, check, recency, duty, and rest evidence for crew options and active
  assignments.
- Crew option availability hints now include a general compliance review
  warning when evidence is missing, expired, or voided.
- Crew option cards show compliance warning snippets.
- Active assignment cards include compliance warnings alongside existing
  qualification warnings.
- Page copy now explicitly states qualification, compliance, and coverage
  issues remain warning-only.

## Boundaries

- No schema changes.
- No seed changes.
- No assignment validation gates were added.
- No release readiness changes.
- No duty/rest legal enforcement.
- No compliance write workflow.

## Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Runtime workflow/browser smoke is pending. Docker Desktop was unavailable, and
the local database start command could not connect to the Docker Desktop Linux
engine.

## Prompt 179 Target

Add crew compliance warnings to FlightLeg release readiness as warning-only
signals. Keep release actions available.

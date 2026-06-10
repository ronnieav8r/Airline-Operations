# Prompt 195: Crew Portal Shell

## Summary

Implement the first read-only crew self-service portal at `/crew/portal`.
The portal is scoped to the authenticated `CREW` user's linked `CrewMember`
record through `CrewMember.userId`.

## Key Changes

- Add `/crew/portal`.
- Require `CREW` role.
- Show setup-required state when the current user is not linked to a
  `CrewMember`.
- Show read-only crew profile, base, employment status, and duty status.
- Show schedule blocks and schedule-period entries.
- Show time-off requests and period-scoped schedule requests.
- Show current aircraft-block assignments and upcoming FlightLeg coverage.
- Show compliance warning summary.
- Reserve visible space for Prompt 196 request submission.

## Boundaries

- No request submission yet.
- No request approval/denial.
- No schedule publishing.
- No aircraft assignment changes.
- No compliance writes.
- No logistics writes.
- No schema changes.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB/browser smoke when Docker Desktop is available.

## Status

Implemented in Prompt 195. Static validation passed. DB-backed runtime/browser
smoke is pending when Docker Desktop is available.

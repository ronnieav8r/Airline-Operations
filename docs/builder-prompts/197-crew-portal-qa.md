# Prompt 197: Crew Portal QA

## Summary

QA the crew portal shell and crew request submission workflow from Prompts
195-196. This is a QA/documentation slice unless a defect is found.

## QA Scope

- Validate static checks.
- Confirm local DB prep status.
- Verify expected behavior:
  - `/crew/portal` requires `CREW` role.
  - Portal resolves only the current user's linked `CrewMember`.
  - Unlinked crew users see setup-required state.
  - Portal shows profile, schedule, time off, requests, assignments, coverage,
    and warnings.
  - Crew can submit their own `TimeOffRequest`.
  - Crew can submit their own `CrewScheduleRequest`.
  - Time-off requests are `PENDING`.
  - Schedule requests are `SUBMITTED`.
  - Crew cannot approve, deny, publish, assign aircraft, or write logistics.

## Runtime QA Status

DB-backed runtime QA is pending in this session because Docker Desktop is not
available. The local DB prep command could not connect to Docker Desktop's
Linux engine.

## Static Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

## Follow-Up Runtime Smoke

When Docker Desktop is available:

1. Start the local database and app.
2. Log in as a linked crew user.
3. Open `/crew/portal`.
4. Submit a time-off request and confirm it appears as `PENDING`.
5. Submit a schedule request and confirm it appears as `SUBMITTED`.
6. Confirm submitted requests are scoped to the linked crew member.
7. Confirm crew role cannot access admin review or assignment mutation actions.
8. Confirm no schedule publishing, aircraft assignment, or logistics writes
   occur.

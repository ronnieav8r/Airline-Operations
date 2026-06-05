# Builder Prompt 06: Read-Only Operational Pages

This prompt records the completed read-only page expansion after the app shell
and authority/control foundation.

## Goal

Replace remaining placeholder operational routes with read-only dynamic pages
that use the existing Prisma schema and crew-resolution logic.

## Completed Pages

- `/aircraft`
- `/crew`
- `/scheduling`

## Scope Rules Used

- Read-only UI only.
- No CRUD.
- No auth changes.
- No schema changes.
- No seed changes.
- No migrations.
- No route-handler mutations.
- Keep `Flight` as the v1 stand-in for future `FlightLeg`.

## Implemented Outcomes

### Aircraft

The Aircraft page shows:

- aircraft tail, type, status, seats, and home station
- current or next flight context
- active aircraft-block crew assignments
- cockpit coverage gaps
- qualification warnings
- active aircraft alerts and maintenance/status signals

### Crew

The Crew page shows:

- crew roster
- employment and duty status
- qualifications
- expiring or expired qualification warnings
- current aircraft assignment
- upcoming flight coverage context through existing coverage resolution

### Scheduling

The Scheduling page shows:

- upcoming legs in a 14-day window
- route, aircraft, status, scheduled and actual times
- crew coverage
- operational-control and release state
- active flight or aircraft alerts

## Validation

The integrated route slice passed:

```powershell
npm run typecheck
npm run lint
npm run build
```

Local route checks passed for:

- `/aircraft`
- `/crew`
- `/scheduling`

Live Render checks passed for:

- `/aircraft`
- `/crew`
- `/scheduling`
- `/api/health`

## Next Prompt Guidance

Do not continue adding broad UI write flows until a schema-planning slice
answers how `Flight` evolves toward `FlightLeg` and how trip/mission,
manifest, locating, release, and assignment records should attach.

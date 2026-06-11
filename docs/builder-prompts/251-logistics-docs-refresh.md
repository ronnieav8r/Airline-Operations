# Prompt 251: Logistics Docs Refresh

## Summary

Refresh Crew Logistics documentation after DB-backed runtime QA. Mark manual
Crew Logistics backend MVP-complete for the current coordination scope, while
keeping provider integrations and automation deferred.

## Completed Boundary

- Manual crew location records.
- Manual logistics needs for positioning, deadhead, airline ticket, hotel,
  ground transport, and other needs.
- Ops/admin crew-scoped create/edit workflow.
- Central read-only `/crew/logistics` workbench.
- Role gates for logistics management and workbench access.
- Cross-links between crew, aircraft, aircraft crew, FlightLeg, planner, and
  logistics surfaces.

## Deferred Boundary

- Provider integrations.
- Live booking.
- Expense/payment workflow.
- File uploads or itinerary attachments.
- Crew self-service logistics writes.
- Automatic positioning recommendations.
- Schedule mutation.
- Aircraft assignment mutation.
- Release behavior changes.
- Duty/rest hard enforcement.

## Validation

- Docs-only review.
- `git diff --check`.

## Next Step

Prompt 252 should run the final backend MVP smoke pass across all completed
backend MVP areas.

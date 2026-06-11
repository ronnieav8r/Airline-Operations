# Prompt 248: Logistics Runtime QA Planning

## Summary

Plan the DB-backed runtime QA pass for Crew Logistics. This is planning/docs
only. It exists because earlier logistics slices passed static validation while
Docker-backed workflow QA was pending.

## QA Scope

Prompt 249 should runtime-test the crew-scoped logistics workflow:

- location create/edit,
- positioning/deadhead/ticket/hotel/ground/other need create/edit,
- status changes,
- provider/confirmation placeholder fields,
- unchanged schedule, assignment, release, and duty/rest tables.

Prompt 250 should runtime-test the central `/crew/logistics` workbench:

- filters,
- grouping,
- summary cards,
- role gates,
- cross-links to crew, aircraft, FlightLeg, and crew-scoped logistics pages.

Prompt 251 should refresh logistics docs/status after runtime QA.

## Product Boundaries

- Logistics is manual coordination context.
- Logistics must not book airline, hotel, or ground transportation.
- Logistics must not create expenses.
- Logistics must not mutate schedules.
- Logistics must not mutate aircraft crew assignments.
- Logistics must not change release behavior.
- Logistics must not enforce duty/rest.
- Crew self-service logistics creation remains deferred.

## Validation Plan

Each runtime QA slice should run:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

Feature-specific QA should use direct DB assertions or focused smoke helpers
where route-only checks are not enough.

## Stop Conditions

Stop and plan if QA exposes a product decision about:

- provider integration,
- booking automation,
- expense tracking,
- crew self-service logistics writes,
- automatic positioning recommendations,
- schedule or assignment mutation from logistics records.

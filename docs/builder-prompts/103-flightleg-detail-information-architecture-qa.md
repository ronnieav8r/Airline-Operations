# Prompt 103: FlightLeg Detail Information Architecture QA

## Summary

Validate the Prompt 102 command-center layout on
`/operations-control/[flightLegId]`.

This is a QA/docs slice. Do not add app behavior unless a defect is found.

## QA Targets

- Confirm FlightLeg detail renders the command-center layout.
- Confirm section navigation exposes Readiness, Release History,
  Aircraft/Airworthiness, Evidence Details, and Raw Reference Data.
- Confirm Release Control actions appear near the top and remain warning-only.
- Confirm evidence workflow links, snapshot links, and aircraft airworthiness
  links still render.
- Confirm complete, partial, and missing evidence states do not break the page.
- Confirm no schema, server action, release behavior, or workflow route changed.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/operations-control/[flightLegId]`, `/operations-control`,
  `/flights`, `/aircraft`, `/crew`, `/scheduling`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`.
- Browser-check one FlightLeg detail page and verify section navigation,
  command-center grouping, release controls, evidence links, snapshot links, and
  raw reference section.

## Expected Result

The command-center layout is ready if the page remains functionally unchanged,
the layout markers render across available demo FlightLegs, and all validation
commands pass.

## Assumptions

- Prompt 103 does not add new app behavior.
- Prompt 104 remains a separate planning session for Operations Control
  workbench improvements.

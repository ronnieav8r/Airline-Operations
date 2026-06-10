# Prompt 192: Crew Request Workflow QA

## Summary

QA the `CrewScheduleRequest` review and request-to-draft helper workflow from
Prompts 190-191. This is a QA/documentation slice unless a defect is found.

## QA Scope

- Validate static checks.
- Confirm local DB prep status.
- Verify expected behavior:
  - Submitted requests can be approved or denied by admin/ops.
  - Review updates status, review notes, reviewed timestamp, and reviewer.
  - Non-submitted requests cannot be reviewed again.
  - Approval does not create schedule entries automatically.
  - Approved pattern requests can prefill pattern preview/generation.
  - Generated draft entries are linked to `sourceRequestId`.
  - Generated entries remain `DRAFT`.
  - No `CrewSchedule` bridge rows are created by request helper generation.
  - No schedule publishing occurs.
  - No aircraft assignments are changed.

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
2. Log in as a seeded admin or ops user.
3. Open `/crew/scheduling/periods/[periodId]`.
4. Approve a submitted pattern request.
5. Use the request-to-preview link.
6. Generate draft entries.
7. Confirm generated entries are `DRAFT` and linked to the approved request.
8. Deny another submitted request.
9. Confirm reviewed requests cannot be reviewed again.
10. Confirm no publish, `CrewSchedule` bridge, or aircraft assignment side
    effects occurred.

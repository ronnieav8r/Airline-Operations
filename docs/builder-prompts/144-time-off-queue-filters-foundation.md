# Prompt 144: Time-Off Queue Filters Foundation

## Summary

Add URL-driven filters to `/crew/scheduling/time-off` while preserving the
Prompt 142 create/review workflow.

## Key Changes

- Add filters for request status, crew member, request type, and date window.
- Keep requests grouped by status after filters are applied.
- Show an active-filter summary and a reset link.
- Preserve filtered return URLs after create/review actions where safe.
- Keep all conflict checks warning-only.

## Boundaries

- No schema changes.
- No new workflow actions beyond existing create, approve, deny, and cancel.
- No crew self-service, schedule writes, assignment automation, duty/rest
  enforcement, imports, provider integrations, or release behavior changes.

## Prompt 145 QA Target

- Validate each filter alone and combined.
- Confirm create/review/cancel actions still work from filtered views.
- Confirm route smoke and validation still pass.

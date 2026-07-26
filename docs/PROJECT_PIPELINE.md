# AeroOps Project Pipeline

Last updated: 2026-07-26

## Policy

All substantive AeroOps work moves through a small, documented slice on the
canonical integration branch. A slice records its scope, acceptance commands,
known blockers, coder checkpoint, and later integrated checkpoint before a new
feature slice is dispatched. Do not start adjacent work merely because it is
listed as next; it must be explicitly approved and dispatched after the prior
slice is accepted.

## Canonical Integration Branch

`codex/aeroops-integration`

## Slice Register

### BASELINE-001 — Integration baseline stabilization

| Field | Value |
| --- | --- |
| Status | Complete locally; awaiting integration review. All listed acceptance commands passed on 2026-07-26. |
| Baseline parent commit | `9e3522fa35baca3cc20db59cc31bea1f5d2a4713` |
| Model | Terra/high |
| Working path | `E:\Codex\Airline Operations\Airline Operations` |
| Scope | Audit and checkpoint the accumulated intentional product, schema, migration, documentation, and focused-smoke work already present in the integration tree. Exclude only generated, secret, cache, log, test-output, or accidental artifacts. |
| Acceptance commands | `npm run prisma:validate`; `npm run typecheck`; `npm run lint`; `npm run build`; `git diff --check`; `npm run smoke:reusable-templates`; `npm run smoke:crew-scheduling-workbench`; `npm run smoke:crew-compliance-evaluator`; `npm run smoke:passenger-identity-documents`; `npm run smoke:aircraft-logbook` |
| Blockers | None found in baseline validation. Do not broaden this checkpoint into feature repair. |
| Coder commit | _pending local checkpoint_ |
| Integrated commit | _pending integration_ |

## Approved Next Slice

The next approved feature is the contextual Maintenance work-package slice
described in `docs/CURRENT_HANDOFF.md`. It is not dispatched by this baseline
checkpoint.

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
| Status | Accepted on 2026-07-26. All listed acceptance commands, local database checks, and rendered browser checks passed. |
| Baseline parent commit | `9e3522fa35baca3cc20db59cc31bea1f5d2a4713` |
| Coder model | Terra/high |
| Lead model | Sol |
| Working path | `E:\Codex\Airline Operations\Airline Operations` |
| Scope | Audit and checkpoint the accumulated intentional product, schema, migration, documentation, and focused-smoke work already present in the integration tree. Exclude only generated, secret, cache, log, test-output, or accidental artifacts. |
| Acceptance commands | `npm run prisma:validate`; `npm run typecheck`; `npm run lint`; `npm run build`; `git diff --check`; `npm run smoke:reusable-templates`; `npm run smoke:crew-scheduling-workbench`; `npm run smoke:crew-compliance-evaluator`; `npm run smoke:passenger-identity-documents`; `npm run smoke:aircraft-logbook` |
| Runtime acceptance | Docker Postgres healthy at `127.0.0.1:5434`; all 31 migrations applied; dashboard, Maintenance, four-week Scheduling, and Crew app rendered successfully; Crew app also passed at `390x844`. The Chrome-only `perkspotbx` extension-injection hydration warning is not an AeroOps defect. |
| Blockers | None. Do not broaden this checkpoint into feature repair. |
| Coder checkpoint commit | `522ffb3fe4fbaaae643d428b9aa51771dc4d2799` |
| Integrated product checkpoint | `522ffb3fe4fbaaae643d428b9aa51771dc4d2799`, accepted as the AeroOps integration baseline. |
| Lead acceptance gate | Local commit `chore: accept AeroOps integration baseline`, immediately following the integrated product checkpoint. Its hash is intentionally recorded in Git history rather than self-referenced here. |

## Approved Next Slice

The next approved feature is the contextual Maintenance work-package slice
described in `docs/CURRENT_HANDOFF.md`. It is not dispatched by this baseline
checkpoint.

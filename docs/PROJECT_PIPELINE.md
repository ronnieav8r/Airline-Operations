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

### MX-003 — Aircraft-grouped maintenance views

| Field | Value |
| --- | --- |
| Status | Coder checkpoint complete; awaiting integration review. |
| Baseline parent commit | `e81e9763cb0f07adec4236233eeaca9465ceaafd` |
| Working branch | `codex/slice-003-aircraft-grouped-maintenance-views` |
| Scope | UI-only grouping of already-filtered Scheduled Maintenance and review-only top-level Logbook results by aircraft. Existing child rows, review links, drawers, filters, ordering, and lifecycle actions are preserved. No lifecycle, authorization, schema, migration, server-action, or service change. |
| Acceptance commands | `npm run typecheck`; `npm run lint`; `npm run build`; `npm run smoke:maintenance-lifecycle`; `npm run smoke:aircraft-logbook`; `git diff --check`; desktop and 390px rendered browser review. |
| Runtime acceptance | `typecheck`, `lint`, webpack production build, both focused maintenance/logbook smokes, `git diff --check`, and desktop/390px rendered review passed. The standard Turbopack build is deferred to integration because this isolated worktree temporarily reuses canonical dependencies through an out-of-root junction that Turbopack rejects. |
| Blockers | None recorded. |
| Coder checkpoint | Local slice commit on the working branch; hash is recorded in Git history to avoid self-reference. |
| Integrated product checkpoint | Pending lead review; do not treat this UI-only checkpoint as integrated. |

### MX-002R — Simplified maintenance availability lifecycle

| Field | Value |
| --- | --- |
| Status | Accepted locally on 2026-07-26. Product, database, static, smoke, and focused rendered-browser gates passed. |
| Baseline parent commit | `8c923193ca30703271d66075f6ea80fd4c3bcdd7` |
| Rejected checkpoint | `03242f9b3741cbc47ef5ef69837c60d91238dcf4` is rejected and must not be merged or used as the replacement implementation. Its additive migration was removed from shared development schema and history during accepted reconciliation. |
| Working branch | `codex/slice-002r-simplified-maintenance-lifecycle` |
| Scope | Logbook-centered discrepancy correction, lightweight scheduled planning/start/sign/release, computed availability, and audited MX Control holds. No user-facing work packages, standalone jobs, labor, parts, or crew execution management. |
| Acceptance commands | `npm run prisma:validate`; `npm run prisma:generate`; `npm run typecheck`; `npm run lint`; `npm run build`; `npm run smoke:maintenance-lifecycle`; `npm run smoke:aircraft-logbook`; relevant serviceability checks; `git diff --check`; desktop and 390px browser review. |
| Runtime acceptance | All 33 migrations are current on isolated `aeroops_mx002r` and shared `aeroops_local`. The rejected additive migration was backed up and exactly reversed from shared development state before the accepted migrations were deployed; Prisma reports no schema difference. Focused lifecycle and direct aircraft-logbook smokes passed. Rendered checks confirmed the serviceability queue, Admin planning-only boundary, and review-only top-level Logbook. The Chrome-only `perkspotbx` hydration warning is external extension injection. |
| Coder checkpoint | `f9778cf7f5a38dd3203d6ef5457e6df96a20944e` (`feat: simplify maintenance availability lifecycle`). |
| Integration repair | `0271da181a1e753947dcb300d58ad81e589e1c12` adds database-enforced signature-purpose uniqueness and serializable signing. |
| Integrated product checkpoint | `0271da181a1e753947dcb300d58ad81e589e1c12`, accepted on `codex/aeroops-integration`. |
| Lead acceptance gate | Local commit `chore: accept simplified maintenance lifecycle`, immediately following the integrated product checkpoint. Its hash is recorded in Git history rather than self-referenced here. |

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

`MX-002R` is accepted. No adjacent feature slice is approved or dispatched by
this acceptance.

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

### MX-004 — Fleet logbook workspace drawer

| Field | Value |
| --- | --- |
| Status | Coder implementation complete on 2026-07-26; ready for lead review. |
| Baseline parent commit | `373a4e3b65aea01c727f9f4e21a52efd1ea174f7` |
| Working branch | `codex/slice-004-fleet-logbook-drawer` |
| Scope | Replace the narrow review-only Logbook entry drawer with a wide URL-addressable per-aircraft workspace that keeps Maintenance Control in Maintenance. Preserve MX-003 overview grouping/toggle behavior; add explicit full-logbook and entry Review actions, aircraft switching, bounded/cursor-reachable tail history, independent filters, responsive split/detail presentation, existing Maintenance/Admin action parity, and safe same-app action returns. Keep the direct aircraft route for compatibility and file/deep-link endpoints. No schema, migration, lifecycle, or serviceability-state change. |
| Acceptance commands | `npm run typecheck`; `npm run lint`; `npm run build` (documented webpack fallback only for isolated dependency junction); `npm run smoke:maintenance-lifecycle`; `npm run smoke:aircraft-logbook`; `npm run smoke:maintenance-logbook-drawer`; `git diff --check`; desktop and 390px rendered browser review. |
| Runtime acceptance | Typecheck, lint, both existing maintenance/logbook smokes, focused drawer query/return-destination smoke, webpack production build, and diff check passed against healthy local Docker Postgres. Rendered desktop and 390px review passed summary-only toggle, full/entry drawer entry points, aircraft switching, independent filtering, URL retention, desktop split, mobile Back, role-visible actions, and zero horizontal overflow. No bounded browser fixture exceeded 50 records; deterministic DB coverage verifies retained pagination, seek-cursor continuation, exact visible ranges, and selected detail outside the visible batch. |
| Build note | Standard Next.js 16.2.7 Turbopack build hit the known isolated-worktree `node_modules` junction panic because the junction points outside the worktree root. `npx next build --webpack` passed. |
| Browser note | Chrome emitted only the known external `perkspotbx` body-class hydration warning. |
| Blockers | None. |
| Coder checkpoint | Local commit `feat: add fleet logbook workspace drawer`; hash is recorded in Git history and the coder handoff rather than self-referenced here. |
| Integrated product checkpoint | Pending lead integration and acceptance. |
| Lead acceptance gate | Pending. |

### MX-003 — Aircraft-grouped maintenance views

| Field | Value |
| --- | --- |
| Status | Accepted locally on 2026-07-26. Static, build, focused smoke, and rendered desktop/~390px gates passed. |
| Baseline parent commit | `e81e9763cb0f07adec4236233eeaca9465ceaafd` |
| Working branch | `codex/slice-003-aircraft-grouped-maintenance-views` |
| Scope | UI-only grouping of already-filtered Scheduled Maintenance and review-only top-level Logbook results by aircraft. Existing child rows, review links, drawers, filters, ordering, and lifecycle actions are preserved. No lifecycle, authorization, schema, migration, server-action, or service change. |
| Acceptance commands | `npm run typecheck`; `npm run lint`; `npm run build`; `npm run smoke:maintenance-lifecycle`; `npm run smoke:aircraft-logbook`; `git diff --check`; desktop and 390px rendered browser review. |
| Runtime acceptance | Canonical `typecheck`, `lint`, standard Next.js 16.2.7 Turbopack production build, both focused maintenance/logbook smokes against healthy local Docker Postgres, and `git diff --check` passed. Desktop review showed 5 CL-65 Scheduled aircraft / 21 children and 1 Logbook aircraft / 3 children; focused status filters produced 1 aircraft / 1 child in each view. Desktop and ~390px expansion, preserved child order, filter-preserving Review links/drawers, selected-group-open state, truthful hidden-write-up context, and zero horizontal overflow passed. |
| Blockers | None. |
| Coder checkpoint | `27da5aa39f14b781c24b345d9237ec48a60f53dd` (`feat: group maintenance views by aircraft`); canonical cherry-pick `07d2b47`. |
| Integration repair | `fea89fd` preserves the already-sorted read-model child sequence and corrects actionable/unresolved Logbook summary semantics. |
| Integrated product checkpoint | `fea89fd`, accepted on `codex/aeroops-integration`. |
| Lead acceptance gate | Local commit `chore: accept aircraft-grouped maintenance views`, immediately following the integrated product checkpoint. Its hash is recorded in Git history rather than self-referenced here. |

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

`MX-004` is the currently dispatched slice and is awaiting lead review. No
adjacent feature slice is approved or dispatched by this coder checkpoint.

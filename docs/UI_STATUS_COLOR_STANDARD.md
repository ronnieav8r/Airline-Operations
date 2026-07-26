# UI Status Color Standard

AeroOps uses status color by operational meaning, not by page preference.

## Semantic Colors

- Green / `success`: current, complete, available, released, or no warnings.
- Red / `stop`: expired, missing required evidence, failed, rejected, cancelled, regulatory concern, or operational stop/review required. Stop surfaces should read as red cells, not white cards with red text.
- Yellow / `caution`: due soon, pending review, incomplete but not yet known failed, filter-empty caution, or attention needed.
- Blue / `info`: planned, active/in progress, neutral reference information, links, helper panels, or non-warning context.
- Zinc / `neutral`: counts, labels, inactive metadata, disabled or archived state.

## Implementation

Use the shared semantic CSS classes from `app/globals.css` before adding raw Tailwind color palettes:

- `status-badge-success`, `status-badge-caution`, `status-badge-stop`, `status-badge-info`
- `status-surface-success`, `status-surface-caution`, `status-surface-stop`, `status-surface-info`
- `status-embedded-caution` for compact warning-only notes inside dense or dark-context panels.
- `status-link-info`

Status badges should be solid, high-contrast pills with white text. Do not use pale-tint badges for primary good/warning/stop signals.

## Crew Compliance Rules

- `CURRENT` is green.
- `DUE_SOON` is yellow.
- `NOT_ENOUGH_DATA` is yellow unless the product later determines the missing data is a hard operational stop.
- `MISSING` is red when the rule represents required evidence.
- `EXPIRED` is red.

## Notes

- Do not use blue for warnings.
- Do not use yellow for expired or missing required regulatory evidence.
- Empty states are usually neutral or blue; use yellow only when the empty state requires attention.
- This standard is visual guidance only. It does not make a workflow legally blocking unless the workflow already enforces blocking behavior.

---
slug: cache-inspector-overflow
completed: 2026-10-07
---

# Summary: Stop the cache inspector from widening the page at phone width

## What Changed

At 360 px the data-fetching practice page was 653 px wide. The cause wasn't the 44rem table itself (its `overflow-x-auto` wrapper clipped it correctly) but the visually hidden "Actions" label in the last header cell: `sr-only` is `position: absolute`, and its containing block was outside the scroll wrapper because the wrapper wasn't positioned, so it escaped the clipping and stretched the document. Adding `relative` to the wrapper contains it.

## Files Modified

| File | Change |
|------|--------|
| `src/practices/data-fetching-hook/cache-inspector.tsx` | `relative` on the table's scroll wrapper |

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build` pass.
- Production build: document width 360 at 360 px (was 653) and 1280 at 1280 px; the table still scrolls inside its box at 360 px; the column header keeps its "Actions" name.
- axe-core: no new issues (only the pre-existing moderate `region`).
- Other scroll containers checked: feed box and chat message box are already `relative`; the users list has no absolutely positioned children.

## Patterns Discovered

- A scroll container must be `relative` (or otherwise positioned) when it holds `sr-only` or other absolutely positioned content, or that content escapes the clipping. Recorded in `.agents/knowledge.md`.

## Follow-Up

None.

---
slug: filtered-list-focus
completed: 2026-10-21
---

# Summary: Let keyboard users scroll the React internals filtered list

## What Changed

The scheduling demo's "Filtered list" scrolls but couldn't take focus, so keyboard users couldn't scroll it and axe reported `scrollable-region-focusable`. It now has `tabIndex={0}`, a focus ring, and `relative` so it stays the containing block for anything positioned inside it. axe on the React internals page is clean in both themes.

## Files Modified

| File | Change |
|------|--------|
| src/handbook/react-internals/scheduling-demo.tsx | Focusable scroll region with a focus ring |

## Patterns Discovered

None

## Follow-Up

None

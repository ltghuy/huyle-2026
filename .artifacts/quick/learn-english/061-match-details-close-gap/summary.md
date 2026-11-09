---
slug: match-details-close-gap
completed: 2026-11-09
---

# Summary: Keep the match details header clear of the close button

## What Changed

The dialog's close button is absolutely placed at `top-2 right-2` (8px in, 28px wide) while the content padding is only 16px, so the header's `ml-auto` friend button ended under it. The header row now has `pr-8`, which leaves a 12px gap between the two.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/arena/match-details.tsx | `pr-8` on the header row |

## Patterns Discovered

None.

## Follow-Up

None.

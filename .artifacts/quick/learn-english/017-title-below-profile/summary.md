---
slug: title-below-profile
completed: 2026-10-28
---

# Summary: Page title below the greeting and profile link

## What Changed

Quick task 012 kept the desktop title beside the pinned pill by reserving `md:pr-80` on the header. The owner wants the title below the pill, so the header now uses `md:pt-[4.75rem]` and no right padding. At 1280px the pill spans 20–68px and the title starts at 76px, the same 8px gap phones have (pill at `top-3`, header `pt-[4.25rem]`).

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/shell/page-header.tsx` | Desktop top padding clears the pill's row; `md:pr-80` removed |

## Patterns Discovered

None.

## Follow-Up

None.

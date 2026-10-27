---
slug: select-dropdown
completed: 2026-10-27
---

# Summary: Select dropdowns open below their box

## What Changed

Base UI's select places the chosen option over the box by default (`alignItemWithTrigger`). That hid the box and left the list's edges out of line with it. The three selects now pass `alignItemWithTrigger={false}` and `p-1` to `SelectContent`. The level options got `min-h-10` like the filters, and the level box uses `data-[size=default]:h-11` so it is really 44 px. Checked in a dark-mode Playwright screenshot: each list sits 4 px under its box with the same left edge and width (256 px for level, 224 px for each filter).

## Files Modified

| File | Change |
|------|--------|
| `src/components/settings/level-setting.tsx` | Box height, list below the box with padding, taller options |
| `src/components/library/exercise-library.tsx` | Both filters: list below the box with padding |

## Patterns Discovered

A size class on `SelectTrigger` needs the `data-[size=default]:` prefix, because the generated `data-[size=default]:h-8` is more specific than a plain `h-11`.

## Follow-Up

`src/components/ui/select.tsx` still defaults to `alignItemWithTrigger = true`. A new select has to pass the same props, or the default could be changed in that CLI-owned file.

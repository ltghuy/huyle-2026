---
slug: home-card-count-green
completed: 2026-10-25
---

# Summary: Move the green from the progress bar to the done count on the home page cards

## What Changed

The progress bar on the home page section cards is back to the default `primary` fill, near white in dark mode and near black in light mode. The green moved to the done count, so in "14 of 14 practices built" the first 14 is green and the rest keeps its colors. The icon tile, "Open" label and hover border are still green from quick task 024.

## Files Modified

| File | Change |
|------|--------|
| src/app/(playground)/page.tsx | Removed the green progress fill; done count wrapped in `text-success` |
| .artifacts/features/048-home-hub-links/spec.md | AC-002 names the done count instead of the progress bar |

## Patterns Discovered

None

## Follow-Up

The 024 summary still says the progress bar is green. 026 supersedes it on that point.

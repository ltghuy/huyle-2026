---
slug: home-cards-green
completed: 2026-10-25
---

# Summary: Use the green accent on the home page section cards

## What Changed

The home page section cards now use the site's green, the `success` token that text links also use, in both themes. The icon is green on a 10% green tile on every card. On cards that link to a section, the progress bar fill and "Open →" are green, and the border turns green on hover. Titles, summaries and the count keep their colors. The progress bar color is set from the page with a `[data-slot=progress-indicator]` selector, so the generated `src/components/ui/progress.tsx` is unchanged.

## Files Modified

| File | Change |
|------|--------|
| src/app/(playground)/page.tsx | Green icon tile, progress fill, "Open" label and hover border on the section cards |
| .artifacts/features/react-handbook/048-home-hub-links/spec.md | AC-002 describes the green cards; AC-006 makes an exception for them |

## Patterns Discovered

The shadcn `Progress` doesn't pass a class to its indicator. A `[&_[data-slot=progress-indicator]]:bg-…` class on the root recolors it without editing the generated file.

## Follow-Up

None

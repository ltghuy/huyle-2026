---
slug: wide-screen-grids
completed: 2026-10-21
---

# Summary: Fill the wider column on the home and section index pages

## What Changed

The 80rem content column left the home page and the section index pages with wide, short cards and empty space beside text capped at `max-w-3xl`. On the home page, "Why it exists" becomes three columns from `xl`, the benefit cards go four across from `2xl`, the section cards go three across from `xl`, and "How this site is built" sits next to "References" from `xl`. Section index cards also go three across from `xl`. Checked in a browser at 1280px and 1680px. Practice and topic pages were left alone: their prose already stays at a readable width and the demos use the full column.

## Files Modified

| File | Change |
|------|--------|
| src/app/(playground)/page.tsx | Wide-screen grid columns for four sections, and a two-column wrapper for "How this site is built" and "References" |
| src/components/playground/section-index.tsx | `xl:grid-cols-3` on the page card grid |

## Patterns Discovered

None

## Follow-Up

None

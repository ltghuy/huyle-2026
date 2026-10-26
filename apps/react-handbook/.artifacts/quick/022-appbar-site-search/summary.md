---
slug: appbar-site-search
completed: 2026-10-22
---

# Summary: Move page search from the sidebar to a search modal in the top bar

## What Changed

The sidebar's "Filter pages" box is gone. A search box now sits in the middle of the top bar, between the menu button and the theme button (on phones it shrinks to an icon). Clicking it, pressing Enter on it or pressing ⌘K (Ctrl K) opens a modal with the cursor in the search field. Pages are listed under their sections in collapsible groups, each with a count of pages or matches. The matching, highlighting and group state come from the Searchable Accordion practice, so the search ignores case and accents, needs every word, and shows the matching part of the summary when only the summary matches. The arrow keys move between groups and results, Enter on the field opens the first result, and Escape closes the modal. The modal opens on activation rather than on focus, because closing it returns focus to the box and would open it again.

## Files Modified

| File | Change |
|------|--------|
| src/components/playground/site-search.tsx | New: top bar search box and the search modal |
| src/components/playground/nav-folders.ts | New: the section and page lists, now with summaries, shared by the sidebar and the search |
| src/components/playground/top-bar.tsx | Search box between the menu and theme buttons |
| src/components/playground/app-sidebar.tsx | Lists moved to nav-folders.ts |
| src/components/playground/practice-nav.tsx | Filter and its "no matches" state removed; reads the lists itself |
| src/components/ui/dialog.tsx | Added with the shadcn CLI |
| .artifacts/features/001-practice-playground/spec.md | AC-021 and AC-022 now describe the page search |
| .artifacts/features/016-performance-handbook/spec.md | AC-001 says "page search" in place of "sidebar filter" |

## Patterns Discovered

The Searchable Accordion modules work for any list: map each item to `{ id, category, question, answer }` and pass it to `indexEntries` and `matchEntry`.

## Follow-Up

None

---
slug: appbar-site-search
status: done
branch: main
created: 2026-10-22
---

# Quick Task: Move page search from the sidebar to a search modal in the top bar

## What

Replace the sidebar's "Filter pages" box with a search box centred in the top bar that opens a search modal, where results are grouped by section in collapsible groups and matches are highlighted the way the Searchable Accordion practice does it.

## Files

- src/components/playground/site-search.tsx (new)
- src/components/playground/nav-folders.ts (new, the section and page lists the sidebar and the search share)
- src/components/playground/top-bar.tsx
- src/components/playground/app-sidebar.tsx
- src/components/playground/practice-nav.tsx
- src/components/ui/dialog.tsx (added with the shadcn CLI)
- .artifacts/features/react-handbook/001-practice-playground/spec.md, .artifacts/features/react-handbook/016-performance-handbook/spec.md (filter ACs)

## Expected Outcome

The top bar shows a search box between the menu button and the theme button. Clicking it, pressing Enter on it or pressing ⌘K (Ctrl K) opens a modal with the cursor in a search field. Every page is listed under its section; each section can be collapsed and shows how many pages match. Typing keeps only the pages whose title or summary contains every word, ignoring case and accents, and marks the matching text; a match found only in the summary shows that part of the summary. The arrow keys move between results, Enter opens one, Escape closes the modal, and when nothing matches the modal says so and offers to clear the search. The sidebar no longer has a filter. The modal opens on activation, not on focus, so closing it (which returns focus to the box) doesn't open it again.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

---
slug: sidebar-active-dot
status: done
branch: main
created: 2026-10-12
---

# Quick Task: Sidebar shows a dot only on the current page, and a new header subtitle

## What

Show the sidebar's dot only on the active item (instead of a status dot on every item) and replace the "N of 14 practices built" subtitle with the content totals.

## Files

- src/components/playground/practice-nav.tsx
- src/components/playground/app-sidebar.tsx
- .artifacts/features/react-handbook/001-practice-playground/spec.md (AC-003)

## Expected Outcome

Only the current page's sidebar item has a dot; titles stay aligned. The header reads "Frontend Handbook / 14 practices · 10 topics".

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

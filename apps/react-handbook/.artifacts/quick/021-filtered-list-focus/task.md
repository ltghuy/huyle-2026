---
slug: filtered-list-focus
status: done
branch: main
created: 2026-10-21
---

# Quick Task: Let keyboard users scroll the React internals filtered list

## What

Make the scheduling demo's "Filtered list" focusable, so keyboard users can scroll it.

## Files

- src/handbook/react-internals/scheduling-demo.tsx

## Expected Outcome

The list takes focus with Tab, shows a focus ring and scrolls with the arrow keys; axe no longer reports `scrollable-region-focusable` on the React internals page.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- axe on /under-the-hood/react-internals in both themes

---
slug: selection-color
status: done
branch: main
created: 2026-10-21
---

# Quick Task: Green text selection color

## What

Replace the browser's default text selection highlight with a green one that works in light and dark mode.

## Files

- src/app/globals.css

## Expected Outcome

Selected text on every page has a green background and readable text color. The colors come from `--selection` and `--selection-foreground` tokens defined for both `:root` and `.dark`.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

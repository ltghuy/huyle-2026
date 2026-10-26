---
slug: wider-content
status: done
branch: main
created: 2026-10-21
---

# Quick Task: Widen the page content column

## What

Raise the playground layout's content max width from `max-w-5xl` (64rem) to `max-w-7xl` (80rem) so pages use more of a large monitor.

## Files

- src/app/(playground)/layout.tsx

## Expected Outcome

On screens wider than about 1280px plus the sidebar, the content column grows to 80rem instead of stopping at 64rem. Smaller screens look the same as before, since the column already fills the space there.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

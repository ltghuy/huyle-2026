---
slug: exercise-tabs-320
status: done
branch: main
created: 2026-11-05
---

# Quick Task: Exercise tabs fit a 320 px phone

## What

The three group tabs on /exercises fit a 320 px wide screen, so the page no longer scrolls sideways.

## Files

- apps/learn-english/src/components/library/exercise-library.tsx

## Expected Outcome

- At 320 px, /exercises is exactly as wide as the screen (scrollWidth equals clientWidth).
- At 360 px and up, the tabs look the same as before.

## Quality Gates

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test
- pnpm --filter learn-english build

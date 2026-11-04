---
slug: tour-step-on-screen
status: done
branch: main
created: 2026-11-04
---

# Quick Task: Tour steps stay on screen

## What

On the home page the tour's "Bài học hôm nay" step sat in the top-left corner while the lesson card it pointed at ran off the bottom of the screen. Keep each step card next to its target and scroll the target into view. Fixes feature 001 AC-039 (the tour points at each area).

## Files

- apps/learn-english/src/components/tour/tour-steps.ts: `sideFor` puts the card above targets too tall for room below; new `scrollDelta`
- apps/learn-english/src/components/tour/app-tour.tsx: targets as stable refs that follow the live element; scroll each step into view
- apps/learn-english/src/components/tour/tour-steps.test.ts: tests for both

## Expected Outcome

Each step's target shows on screen with its card beside it, also when the page swaps the target element after the tour starts.

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm test

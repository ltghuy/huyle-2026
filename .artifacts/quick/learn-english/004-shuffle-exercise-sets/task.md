---
slug: shuffle-exercise-sets
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Quick Task: A new question order each time a set opens in /exercises

## What

Opening a set in `/exercises` starts from a random round, so the questions come in a new order (with new distractors and blanks) on every visit instead of the same order each time.

## Files

- `src/components/library/exercise-run.tsx`: optional `shuffled` prop picks a random first round
- `src/components/library/exercise-library.tsx`: passes `shuffled`
- `src/components/library/exercise-sets.ts`: header comment
- `src/components/library/exercise-library.test.tsx`: test

## Expected Outcome

Each open of a set (from the list, a shared `?id=` link, or back/forward) builds its steps from a random round ≥ 1; "Làm lại" moves on to the next round as before. `buildSetSteps` stays pure and deterministic per (set, round). The grammar topic page's practice keeps its fixed order.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`

---
slug: exercise-level-switch-lag
status: done
branch: main
created: 2026-10-31
---

# Quick Task: Make switching level on /exercises fast

## What

`listSetCards` checks which sentences can make each exercise type by building the whole exercise (`prepareStep`) for every sentence × 6 types, and each build shuffles the level's full headword pool. On B2 (5,580 sentences, 2,776 words) that blocks the main thread for about 2.8s on every level switch. Check eligibility with the builders' own null conditions instead, and collect a pool's headwords once.

## Files

- `src/lib/session/prepare.ts`: cache the headwords of a word pool; add `canPrepareStep`, which answers "would `prepareStep` return a step" without building one
- `src/learning/exercises/tile-translate.ts`: export the distractor check the builder uses
- `src/components/library/exercise-sets.ts`: `eligibleSentences` uses `canPrepareStep`

## Expected Outcome

Same cards and the same `itemIds` per set as before; `listSetCards` for B2 well under 300ms (measured in Node with the real content).

## Quality Gates

- `pnpm --filter learn-english lint --fix`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

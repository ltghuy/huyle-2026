---
slug: shuffle-exercise-sets
completed: 2026-10-27
---

# Summary: A new question order each time a set opens in /exercises

## What Changed

Sets in the exercise library used to be seeded from the set id alone, so a set showed the same questions in the same order on every visit until "Làm lại". `ExerciseRun` now takes a `shuffled` prop; with it, the run starts from a random round (1 to 2^20) chosen when the run mounts. The library passes it and keys the run by set id, so every open (from the list, a `?id=` link, or back/forward) gets a new question order, option order and blanks. `buildSetSteps` is unchanged and still deterministic per (set, round). The grammar topic page does not pass `shuffled` and keeps its fixed order.

## Files Modified

| File | Change |
|------|--------|
| `src/components/library/exercise-run.tsx` | `shuffled` prop and `randomRound()` for the first round |
| `src/components/library/exercise-library.tsx` | Passes `shuffled` |
| `src/components/library/exercise-sets.ts` | Header comment describes the random start |
| `src/components/library/exercise-library.test.tsx` | Opens a set under two `Math.random` values and checks the shown prompt and option order match that round; fails without the change |

## Patterns Discovered

None.

## Follow-Up

None.

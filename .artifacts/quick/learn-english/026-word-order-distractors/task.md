---
slug: word-order-distractors
status: done
branch: main
created: 2026-10-30
---

# Quick Task: Distractor tiles in the word order exercise

## What

"Sắp xếp các từ thành câu đúng" adds up to 2 tiles that don't belong in the sentence, so the learner has to spot the extra words as well as fix the order.

## Files

- `src/learning/exercises/word-order.ts`: picks the distractors and mixes them into the tiles
- `src/learning/exercises/word-order.test.ts`: tests
- `src/components/exercise/sentence-exercises.tsx`: "Kiểm tra" is enabled once as many tiles as the sentence has words are placed, not all tiles
- `src/lib/session/prepare.ts`: passes the same-level headword pool (also for the dictation fallback)
- `src/components/exercise/exercise-runner.test.tsx`: callers pass a pool
- `.artifacts/features/learn-english/001-learn-english-app/spec.md`: AC-033 mentions the extra tiles

## Expected Outcome

Distractors come first from the sentence's reviewed wrong variants: words in a variant that are not tokens of the sentence, such as "has" or "an" for "I have a dog". These are near misses that test grammar and are harder to rule out than random words. Any slots left are filled from the same headword pool tile-translate uses. A distractor never matches a token (compared normalized), so grading is unchanged: the answer has to be exactly the sentence's tokens in an accepted order. If there's no candidate at all, the exercise shows only the sentence's tokens, as before, so the dictation fallback always builds.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`

---
slug: word-order-distractors
completed: 2026-10-30
---

# Summary: Distractor tiles in the word order exercise

## What Changed

The word order exercise now mixes up to 2 extra tiles in with the sentence's words. They come first from the words of the sentence's reviewed wrong variants that aren't in the sentence ("plays" gets "play", "I have a dog" gets "has" and "an"), so each one is a near miss the learner has to reject on grammar. Same-level headwords, the pool tile-translate uses, fill any slot left. Words are compared on letters and digits only, so "a.m." never shows up next to "a.m". Grading is unchanged: the answer must be exactly the sentence's tokens in an accepted order. "Kiểm tra" now unlocks once as many tiles as the sentence has words are placed. Over all 15,727 approved sentences (seed 7, empty pool), 13,064 get two distractors from their variants, 2,475 get one and 188 get none.

## Files Modified

| File | Change |
|------|--------|
| `src/learning/exercises/word-order.ts` | picks distractors (variants first, then pool) and inserts them at random places |
| `src/learning/exercises/word-order.test.ts` | variant-first choice, case and punctuation matching, no-candidate case, distractor answer rejected |
| `src/components/exercise/sentence-exercises.tsx` | `minToCheck` is the token count |
| `src/lib/session/prepare.ts` | passes `distractorWords` to word order and to the dictation fallback |
| `src/components/exercise/exercise-runner.test.tsx` | callers pass a pool |
| `.artifacts/features/learn-english/001-learn-english-app/spec.md` | AC-033 mentions the extra tiles |

## Patterns Discovered

Shuffling the token tiles and the distractors together again can put the tokens back in an accepted order, with the distractors in between, which undoes `shuffleTokens`. Word order inserts the distractors into the already-shuffled tokens instead. `tile-translate.ts` still shuffles everything together, so it has the same small chance.

## Follow-Up

- `buildTileTranslate` could insert its distractors the same way.
- A variant word at the start of a sentence keeps its capital ("Does"), as written in the variant.

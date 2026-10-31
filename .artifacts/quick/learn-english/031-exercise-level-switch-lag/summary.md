---
slug: exercise-level-switch-lag
completed: 2026-10-31
---

# Summary: Make switching level on /exercises fast

## What Changed

`listSetCards` decided which sentences fit each exercise type by building every exercise (`prepareStep`) for every sentence of the level. Each build of word order, sentence gap, tile translate and dictation recomputed the level's headword pool and shuffled all of it, so B2 (5,580 sentences) took 2.8s of main-thread time per level switch. Eligibility now comes from `canPrepareSentenceStep`, which uses the builders' own null conditions without building anything. The headwords of a word pool are collected once per pool, and the cards are cached per loaded index and level. Measured in Node with the real content: A1 346 → 72ms, B1 2,196 → 211ms, B2 2,801 → 238ms, C1 471 → 94ms. A script comparing `canPrepareSentenceStep` with the old probe found no difference for any sentence at any level.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/lib/session/prepare.ts` | Pool headwords cached in a WeakMap; `distractorWords` keeps its exact output; new `canPrepareSentenceStep` |
| `apps/learn-english/src/learning/exercises/tile-translate.ts` | `hasTileDistractors`, the builder's null condition without the shuffle |
| `apps/learn-english/src/components/library/exercise-sets.ts` | `eligibleSentences` uses `canPrepareSentenceStep`; cards cached per index and level |

## Patterns Discovered

Eligibility probes must not call a builder that shuffles a level-sized pool: check the builder's null condition instead.

## Follow-Up

- Most of the remaining ~240ms on B2 is `find-error` eligibility, which has to search each sentence's wrong variants. It could move to content publish time if it matters on slow phones.
- On the first visit to a level, the page still shows a skeleton while that level's content downloads (B2 sentences are about 7MB of JSON before compression). Later visits read it from IndexedDB.

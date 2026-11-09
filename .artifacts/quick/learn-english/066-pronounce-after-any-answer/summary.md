---
slug: pronounce-after-any-answer
completed: 2026-11-10
---

# Summary: Say the right word after every checked answer

## What Changed

`usePronounceWhenRight` became `usePronounceWhenChecked`: it plays the word's clip once any result is shown, not only a right one. The wrong chime is about as long as the right one, so the 450 ms delay still follows it. The test that expected silence after a wrong answer now expects the right word's clip, and the sound-off case has its own test. Exercise tests (64), lint and typecheck pass.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/exercise/word-exercises.tsx` | play on any checked answer |
| `apps/learn-english/src/components/exercise/exercise-runner.test.tsx` | wrong answer now plays; sound-off test |
| `apps/learn-english/src/components/exercise/audio-button.tsx`, `src/learning/exercises/{mcq,recall}.ts` | comments |
| `.agents/baselines/learn-english/exercise-runner.md` | word clip behavior |

## Patterns Discovered

None

## Follow-Up

None

---
slug: pronounce-after-any-answer
status: done
branch: main
created: 2026-11-10
---

# Quick Task: Say the right word after every checked answer

## What

Multiple choice, recall and missing letters say the right word once after "Kiểm tra", whether the answer was right or wrong (owner, 2026-11-10). Until now a wrong answer played nothing (quick 009).

## Files

- `apps/learn-english/src/components/exercise/word-exercises.tsx` (`usePronounceWhenChecked`)
- `apps/learn-english/src/components/exercise/exercise-runner.test.tsx`
- `apps/learn-english/src/components/exercise/audio-button.tsx`, `src/learning/exercises/{mcq,recall}.ts` (comments)
- `.agents/baselines/learn-english/exercise-runner.md`

## Expected Outcome

The right word's clip plays 450 ms after the right or wrong chime. It is still silent when "Âm thanh khi trả lời" is off or the word has no clip, and it stops if the learner presses "Tiếp tục" first.

## Quality Gates

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

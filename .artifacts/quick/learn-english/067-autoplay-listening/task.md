---
slug: autoplay-listening
status: done
branch: main
created: 2026-11-10
---

# Quick Task: Play the word when a listening question shows

## What

"Nghe và chọn từ bạn nghe được", "Nghe và gõ lại từ" and the verb forms listening question play their clip once when they appear, so the learner doesn't have to press the speaker first (owner, 2026-11-10). Nghe chép already plays its sentence on its own.

## Files

- `apps/learn-english/src/components/exercise/audio-button.tsx` (`autoPlay`)
- `apps/learn-english/src/components/exercise/word-exercises.tsx`, `forms-exercises.tsx`
- `apps/learn-english/src/components/exercise/exercise-runner.test.tsx`
- `.agents/baselines/learn-english/exercise-runner.md`

## Expected Outcome

The clip starts as soon as the question shows and stops if the learner moves on. The speaker button replays it. If the browser blocks audio that starts by itself, nothing is shown and the button still works; a tap still reports a clip that can't load and swaps the question for recall.

## Quality Gates

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

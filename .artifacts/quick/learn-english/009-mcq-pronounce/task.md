---
slug: mcq-pronounce
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Quick Task: Say the word after a right answer (multiple choice, missing letters, recall)

## What

In "Trắc nghiệm nghĩa", "Điền chữ còn thiếu" and "Nhớ lại từ", play the target word's pronunciation once when the checked answer is right (extended from multiple choice on the owner's request).

## Files

- `src/learning/exercises/mcq.ts`, `recall.ts`: the instance carries the word's `audio` (missing letters already did)
- `src/components/exercise/audio-button.tsx`: `playClipOnce`
- `src/components/exercise/word-exercises.tsx`: `usePronounceWhenRight` in `McqView`, `MissingLettersView` and `RecallView`
- `src/components/settings/sound-toggle.tsx`: the switch's description mentions it
- `src/components/exercise/exercise-runner.test.tsx`: tests

## Expected Outcome

After "Kiểm tra" on a right answer, the word plays once, 450 ms later so it follows the "correct" chime. A wrong answer plays nothing. It is silent when "Âm thanh khi trả lời" is off or the word has no clip, and it stops if the learner presses "Tiếp tục" first. Failures to play are silent (no toast).

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`

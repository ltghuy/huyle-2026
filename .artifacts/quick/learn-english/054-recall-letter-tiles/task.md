---
slug: recall-letter-tiles
status: done
branch: main
created: 2026-11-06
---

# Quick Task: Letter tiles with live feedback for "Gõ từ tiếng Anh có nghĩa là"

## What

Replace the free-text box of the meaning recall exercise with one empty tile per letter of the answer, the room-code style, and color each typed letter green when it matches the answer at that position and red when it doesn't.

## Files

- apps/learn-english/src/components/arena/letter-slots.tsx (optional `answer` colors each letter)
- apps/learn-english/src/components/exercise/letter-input.tsx (new: tiles over one real input, Telex hint)
- apps/learn-english/src/components/exercise/english-input.tsx (exports the Telex hint)
- apps/learn-english/src/components/exercise/word-exercises.tsx (RecallView uses it)
- apps/learn-english/src/components/exercise/letter-input.test.tsx (new)
- apps/learn-english/src/components/arena/question-views.tsx (Arena "Nhớ lại từ" types into the tiles)

## Expected Outcome

"companion" shows 9 empty dashed tiles. Typing "c" fills the first tile with a green "c"; a wrong letter shows red. Spaces, hyphens and apostrophes in the answer stay as fixed marks. Typing, pasting and screen readers still go through one labelled input ("Từ tiếng Anh"), Telex output is folded back to ASCII before it is compared, and grading is unchanged (variants and the one-slip typo rule still count). The tiles take focus as each question opens. Ôn tập, Bài tập and Hôm nay share the exercise runner, so they all get this. The Arena's "Nhớ lại từ" also types straight into the tiles (no separate text box) and focuses them, but its tiles only fill and never turn green or red, because players never receive the word.

## Quality Gates

Run after the change, before marking done:

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test
- pnpm --filter learn-english build

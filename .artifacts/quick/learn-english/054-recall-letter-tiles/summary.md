---
slug: recall-letter-tiles
completed: 2026-11-06
---

# Summary: Letter tiles with live feedback for "Gõ từ tiếng Anh có nghĩa là"

## What Changed

The meaning recall exercise no longer shows a free-text box. It shows one empty dashed tile per letter of the word, in the room-code style, so "companion" starts as 9 tiles. As the learner types, each letter lands in the next tile and turns green when it matches the word's letter in that place, red when it doesn't. Spaces, hyphens and apostrophes stay as fixed marks. A real input sits invisibly over the tiles (as with the room code), so typing, pasting, Enter to check and screen readers work as before. Telex output is folded back to ASCII before the tiles compare it, the Telex hint still shows, and the input takes no more letters than there are tiles. Grading is unchanged. The input takes focus as each question opens, so the learner can type straight after "Tiếp tục". Ôn tập, Bài tập and Hôm nay all render recall through the same `RecallView`. The Arena's "Nhớ lại từ" now types into the same tiles instead of a text box under them, keeping retries, the shake and the selected text after a wrong try; its tiles never turn green or red, since its client only gets the mask, never the word.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/arena/letter-slots.tsx | Optional `answer` prop and `letterVerdicts()` color each typed letter |
| apps/learn-english/src/components/exercise/letter-input.tsx | New: tiles over one real input, Telex hint, letter cap |
| apps/learn-english/src/components/exercise/english-input.tsx | Telex hint pulled out as `TelexHint` |
| apps/learn-english/src/components/exercise/word-exercises.tsx | `RecallView` uses `LetterInput` |
| apps/learn-english/src/components/arena/question-views.tsx | `QuestionRecall` uses `LetterInput` without the word; "Gửi" moves under the tiles |
| .artifacts/features/learn-english/023-arena/spec.md | AC-014 notes the tile input and why it has no colors |
| apps/learn-english/src/components/exercise/letter-input.test.tsx | New: empty tiles, green/red, marks, Telex, letter cap, focus, no colors without the word |
| .artifacts/features/learn-english/001-learn-english-app/spec.md | AC-012 notes the tile input and the focus |

## Patterns Discovered

None.

## Follow-Up

- Live per-letter feedback lets a learner find the word by trial and error, so a recall answered this way can look like a real recall to the scheduler. If that skews reviews, one option is to mark a recall as Hard when any red letter appeared.
- A variant spelling longer than the headword ("colour" for "color") can no longer be typed, because the input stops at the tile count.
- "Nghe và gõ lại từ" (listening typing) still uses the free-text box.

---
slug: other-topic-word-types
completed: 2026-11-04
---

# Summary: Word exercises in "Chủ đề khác"

## What Changed

`buildSetCards` now adds one set per word type to the "Chủ đề khác" card, over the words of the level that the level's sentences list in `wordIds`, each once. "Trắc nghiệm nghĩa" keeps the topic cards' rule (the level needs at least 4 words). The card carries `wordCount`, and the library shows it as "N từ · M câu". In the current content every word of a level appears in that level's sentences, so the card covers all of them (A1: 1164 words).

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/library/exercise-sets.ts | word sets, `sentenceWordIds`, `wordCount` |
| apps/learn-english/src/components/library/exercise-library.tsx | card label |
| apps/learn-english/src/components/library/exercise-library.test.tsx | test for the word sets |
| .artifacts/features/learn-english/018-sentence-writing-tab/spec.md | AC-005 |

## Follow-Up

None.

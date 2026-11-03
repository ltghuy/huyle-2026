---
slug: word-order-result-words
status: done
branch: main
created: 2026-11-03
---

# Quick Task: Word-order result shows the sentence word by word

## What

After a word-order answer is checked, the correct sentence is shown as word chips like the question's tiles, and tapping a word the course knows opens the word dialog (meanings, examples, audio, "Đánh dấu đã học"). Extends feature 001 AC-034 (correct sentence shown after checking).

## Files

- src/learning/sentence-words.ts (+ test): match each token to a course word (headword or variant, then irregular verb forms, "is/am/are" → "be", and simple -s/-ed/-ing endings), preferring the sentence's own `wordIds`
- src/components/exercise/sentence-words.tsx: the chips and the word dialog
- src/components/exercise/sentence-exercises.tsx: `CorrectSentence` takes the tokens for word order
- src/components/vocabulary/word-lookup.ts: `lookupWord` moved out of `vocabulary-browser.tsx` so both use it

## Expected Outcome

The result card reads "Her · idea · is · very · original" as chips. Matched words are buttons that open the word dialog; tokens with no course word are plain chips. The audio button and Vietnamese line stay. Words are looked up in the levels the learner's lessons load (their level and the one above).

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm test

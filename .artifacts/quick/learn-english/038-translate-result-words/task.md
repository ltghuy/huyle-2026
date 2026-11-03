---
slug: translate-result-words
status: done
branch: main
created: 2026-11-03
---

# Quick Task: Dịch câu result shows the sentence word by word

## What

Once a "Dịch câu" answer is checked, show the correct sentence as word chips that open the word dialog, the same way the word-order result does (quick task 037). Extends feature 001 AC-034 and feature 016.

## Files

- apps/learn-english/src/learning/exercises/translate.ts: the instance carries the sentence's `tokens` and `wordIds`
- apps/learn-english/src/components/exercise/translate-exercise.tsx: passes them to `CorrectSentence`

## Expected Outcome

"The princess wears a long dress." in the result card is a row of chips. Each course word opens its details, and the Vietnamese line and audio button stay.

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm test

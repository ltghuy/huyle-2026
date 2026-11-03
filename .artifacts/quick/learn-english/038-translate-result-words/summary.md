---
slug: translate-result-words
completed: 2026-11-03
---

# Summary: Dịch câu result shows the sentence word by word

## What Changed

The translate instance now carries the sentence's tokens and word ids, and its result card passes them to `CorrectSentence`, which shows the `SentenceWords` chips from quick task 037. "Câu của bạn" (shown when the answer is wrong or claimed) stays plain text.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/learning/exercises/translate.ts | `tokens`, `wordIds` on `TranslateInstance` |
| apps/learn-english/src/components/exercise/translate-exercise.tsx | `words={instance}` on `CorrectSentence` |
| .artifacts/features/learn-english/001-learn-english-app/spec.md | AC-034 note covers Dịch câu |

## Patterns Discovered

None.

## Follow-Up

Fill the gap, dictation and find the error still show the sentence as plain text; they could pass their tokens the same way.

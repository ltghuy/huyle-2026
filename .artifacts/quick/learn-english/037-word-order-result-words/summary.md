---
slug: word-order-result-words
completed: 2026-11-03
---

# Summary: Word-order result shows the sentence word by word

## What Changed

Once a word-order answer is checked, the correct sentence in the result card is shown as word chips, styled like the question's tiles. A chip that matches a course word is a button that opens the vocabulary word dialog (meanings, examples, audio, "Đánh dấu đã học"). Tokens with no course word stay as plain chips. A token is matched on its headword or variant first, then on irregular verb forms, "am/is/are" → "be", and simple -s/-es/-ies/-ed/-ing endings. Among words with the same spelling, the sentence's own `wordIds` win, then the part of speech the ending points to ("likes" → the verb "like", not the preposition). Words are looked up in the levels the learner's lessons load (their level and the one above), so the index is usually cached already. Feature 001 AC-034 now mentions this.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/learning/sentence-words.ts | New: `buildWordFinder`, token → word id |
| apps/learn-english/src/learning/sentence-words.test.ts | New: matcher tests |
| apps/learn-english/src/components/exercise/sentence-words.tsx | New: `SentenceWords` chips + word dialog |
| apps/learn-english/src/components/exercise/sentence-exercises.tsx | `CorrectSentence` takes optional `words`; word order passes its tokens |
| apps/learn-english/src/components/vocabulary/word-lookup.ts | New: `lookupWord` moved out of the vocabulary browser so both use it |
| apps/learn-english/src/components/vocabulary/vocabulary-browser.tsx | Imports `lookupWord` |
| .artifacts/features/learn-english/001-learn-english-app/spec.md | AC-034 note |

## Patterns Discovered

None.

## Follow-Up

- Six files instead of quick mode's usual three: the shared `lookupWord` move and the pure matcher with its tests account for the extra files.
- In the exercise library, a sentence from a level well above the learner's (e.g. C1 for an A1 learner) has its higher-level words shown as plain chips, because only the learner's levels are loaded.
- The other sentence exercises (fill the gap, translate) could use the same chips later.

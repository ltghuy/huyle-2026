---
slug: listening-meaning
completed: 2026-10-27
---

# Summary: Show the word's IPA and meaning after a listening exercise

## What Changed

Listening exercises named the word but never said what it means. Both listening instances now carry the word's `ipa`, and once the answer is checked both views show a `WordReveal` block under the options or input: the headword, its IPA (when the content has one) and the Vietnamese meanings. It shows after right and wrong answers and stays until "Tiếp tục", so the 2 s auto-hide of "Chính xác!" doesn't take it away. Before checking nothing is shown, so the meaning doesn't give the answer away.

## Files Modified

| File | Change |
|------|--------|
| `src/learning/exercises/listening.ts` | `ipa` on both listening instances |
| `src/components/exercise/word-exercises.tsx` | `WordReveal`, rendered in `ListeningChoiceView` and `ListeningTypingView` after checking |
| `src/learning/exercises/listening.test.ts` | Instances carry IPA and meanings |
| `src/components/exercise/exercise-runner.test.tsx` | Reveal is hidden before checking and shows word, IPA and meaning after |

## Patterns Discovered

None.

## Follow-Up

Not checked visually in the browser yet.

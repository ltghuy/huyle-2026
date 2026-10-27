---
slug: listening-meaning
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Quick Task: Show the word's IPA and meaning after a listening exercise

## What

After a listening exercise is checked (choice or typing), show the word with its IPA and Vietnamese meanings under the answer, e.g. "prince /prɪns/ · hoàng tử".

## Files

- `src/learning/exercises/listening.ts`: listening instances carry `headword` and `ipa`
- `src/components/exercise/word-exercises.tsx`: a `WordReveal` block in both listening views
- `src/learning/exercises/listening.test.ts`, `src/components/exercise/exercise-runner.test.tsx`: tests

## Expected Outcome

Once "Kiểm tra" is pressed on a listening exercise, a block under the options (or the input) shows the headword, its IPA (when the content has one) and its Vietnamese meanings. It shows for right and wrong answers and stays until the learner moves on, unlike the "Chính xác!" panel that hides after 2 s. Nothing is shown before checking, so the meaning doesn't give the answer away.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`

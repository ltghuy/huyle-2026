---
slug: other-topic-word-types
status: done
branch: main
created: 2026-11-04
---

# Quick Task: Word exercises in "Chủ đề khác"

## What

The "Chủ đề khác" card at the end of "Từ vựng" only had sentence exercises. Give it the four word exercises the topic cards have ("Trắc nghiệm nghĩa", "Điền chữ còn thiếu", "Nghe và chọn từ", "Nhớ lại từ"), over the level's words that its sentences use. Adjusts feature 018 AC-005.

## Files

- apps/learn-english/src/components/library/exercise-sets.ts: word sets on the `word.sentences` card, `wordCount`
- apps/learn-english/src/components/library/exercise-library.tsx: card label "N từ · M câu"
- apps/learn-english/src/components/library/exercise-library.test.tsx: new test
- .artifacts/features/learn-english/018-sentence-writing-tab/spec.md: AC-005

## Expected Outcome

At A1 the card shows "1164 từ · 1220 câu" with the four word buttons first, then the five sentence buttons. Set ids are `<type>.<level>.khac`, as for the sentence sets.

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm test

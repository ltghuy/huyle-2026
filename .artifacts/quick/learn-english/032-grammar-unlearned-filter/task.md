---
slug: grammar-unlearned-filter
status: done
branch: main
created: 2026-11-01
---

# Quick Task: Show only what is not learned yet on /grammar and /vocabulary

## What

Add a switch above the level list on `/grammar`, "Chỉ hiện chủ điểm chưa học". When it is on, each level lists only the published topics the learner hasn't learned yet. Topics marked "Sắp có" are hidden too, since they can't be studied yet.

On `/vocabulary`, the word list gets the same kind of switch, "Chỉ hiện từ chưa học". It applies to a level's words (all topics or one topic) and to a specialized set's words. The page owns the state, so it stays on when the learner changes topic, level or set.

## Files

- `src/components/grammar/grammar-browser.tsx`: the switch, filtered rows, and an empty message for a level with nothing left
- `src/components/grammar/grammar-browser.test.tsx`: test for the filter
- `src/components/vocabulary/word-list.tsx`: the switch, filtered words, and "Bạn đã học hết các từ ở đây." when none are left
- `src/components/vocabulary/vocabulary-browser.tsx`, `set-view.tsx`: hold the state and pass it to `WordList`
- `src/components/vocabulary/vocabulary-browser.test.tsx`: test for the filter

## Expected Outcome

- The switch is off by default and the list looks as it does today.
- With it on, learned and coming-soon topics disappear from every level. The level heading and the "Đã học x/y" progress stay the same.
- A level with published topics that are all learned shows "Bạn đã học hết các chủ điểm ở trình độ này."
- On `/vocabulary`, the topic chips and "Bạn đã học x/y từ" keep their full counts; only the cards are filtered, and "Xem thêm" pages through the filtered words.
- The choice isn't saved; it resets when the page reloads.

## Quality Gates

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

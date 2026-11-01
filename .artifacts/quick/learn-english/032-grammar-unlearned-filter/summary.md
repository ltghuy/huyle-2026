---
slug: grammar-unlearned-filter
completed: 2026-11-01
---

# Summary: Show only what is not learned yet on /grammar and /vocabulary

## What Changed

`/grammar` now has a switch above the levels, "Chỉ hiện chủ điểm chưa học". When it is on, each level lists only published topics without a card. Learned and "Sắp có" topics are hidden, and the level heading and progress bar keep their full counts. A level with every published topic learned says "Bạn đã học hết các chủ điểm ở trình độ này."; a level with nothing published keeps its "đang được biên soạn" message. The switch is plain component state and starts off on every visit.

`/vocabulary` got the same idea for words: "Chỉ hiện từ chưa học" sits at the top of `WordList`, so it covers level lists and specialized sets. `VocabularyBrowser` holds the state because `WordList` remounts per level, topic and set. Chip counts and the level progress keep the full totals. When nothing is left, the list says "Bạn đã học hết các từ ở đây."

## Files Modified

| File | Change |
|------|--------|
| `src/components/grammar/grammar-browser.tsx` | Switch, `isLearned` helper, filtered rows and the all-learned message in `LevelSection` |
| `src/components/vocabulary/word-list.tsx` | Switch, filtered words, all-learned message; "Xem thêm" counts the filtered words |
| `src/components/vocabulary/vocabulary-browser.tsx`, `set-view.tsx` | Own the switch state and pass it down |
| `src/components/vocabulary/vocabulary-browser.test.tsx` | Test: filter hides learned words, survives a topic change, shows the all-learned message |
| `src/components/grammar/grammar-browser.test.tsx` | Test: with a learned A1 topic, the filter hides it and the coming-soon rows, shows the all-learned message, keeps A2's unlearned topic |

## Patterns Discovered

None.

## Follow-Up

The choice isn't remembered. If learners want it to stick (on either page), keep it in `localStorage` the way `answer-sound` does, or in a `?` query param.

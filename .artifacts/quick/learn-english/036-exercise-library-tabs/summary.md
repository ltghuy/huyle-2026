---
slug: exercise-library-tabs
completed: 2026-11-02
---

# Summary: Split /exercises into three tabs

## What Changed

The exercise library has a "Nhóm bài tập" tab row (line style) above the level and filter row: Từ vựng, Ngữ pháp and Mẫu câu, each with its icon and number of sets at the chosen level. The chosen tab is in the URL as `?tab=word|grammar|sentence`. Without `?tab`, the tab comes from `?type=` (so `?type=translate` opens Mẫu câu), then from an open set's group, then defaults to Từ vựng.

Each tab shows only its filters. Từ vựng and Mẫu câu have a topic filter, and a type filter listing their own exercise types. Ngữ pháp has neither, because it has no topics and only one type. Switching tabs clears the type and keeps the topic, since Từ vựng and Mẫu câu share topics; a topic the tab doesn't have reads as "Tất cả chủ đề". The empty state names the tab ("Chưa có bài tập mẫu câu trình độ B2").

On phones the three tabs split the width, drop their icons and use smaller text, so they fit 360 px without scrolling. Measured in the browser: 315 px needed, 328 px available.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/library/exercise-library.tsx` | Tabs, `?tab=` with fallbacks, filters per tab |
| `apps/learn-english/src/components/library/exercise-library.test.tsx` | Tab counts and switching, tab picked from `?type=`, filters within a tab |

## Follow-Up

- The e2e specs (`exercises.spec.ts`, `translate.spec.ts`) should still pass as they are: the first one starts the first set of the default tab, the second opens `?type=translate`. They weren't run in this change.

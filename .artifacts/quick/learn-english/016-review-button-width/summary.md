---
slug: review-button-width
completed: 2026-10-28
---

# Summary: Don't stretch the Ôn tập button

## What Changed

The owner asked for the review card's button not to span the whole card. It now has `sm:w-auto sm:px-8`, the same sizing as the grammar topic's "Luyện tập" button, and stays `w-full` on phones where a wide tap target helps.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/review/review-overview.tsx` | `sm:w-auto sm:px-8` on the start-review link |

## Patterns Discovered

None.

## Follow-Up

The home page's "Bài học hôm nay" card (`src/components/lesson/today-lesson.tsx`) has the same full-width button and was left as is.

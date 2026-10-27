---
slug: greeting-wave
completed: 2026-10-27
---

# Summary: 👋 before the home greeting

## What Changed

The owner asked for an emoji to the left of the greeting. The greeting is now a flex row: a 👋 marked `aria-hidden`, then "Chào {tên}!" at `text-xl font-semibold` (was `text-lg font-medium`). The hand turns on a `wave` keyframe, twice over 1.2 s, around a point near the wrist. The app's global reduced-motion rule stops it. Checked in a dark-mode screenshot. The first-visit e2e test still finds "Chào Minh Anh!".

## Files Modified

| File | Change |
|------|--------|
| `src/components/lesson/today-lesson.tsx` | Emoji and larger greeting |
| `src/app/globals.css` | `--animate-wave` and its keyframes in `@theme` |

## Patterns Discovered

None.

## Follow-Up

None.

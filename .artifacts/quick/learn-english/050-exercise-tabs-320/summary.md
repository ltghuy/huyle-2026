---
slug: exercise-tabs-320
completed: 2026-11-05
---

# Summary: Exercise tabs fit a 320 px phone

## What Changed

At 320 px, /exercises scrolled sideways by 15 px. Its three group tabs ("Từ vựng", "Ngữ pháp", "Viết câu", each with a count badge) can't wrap, and together they were wider than the screen. Below 360 px the tab list now has no gap, and each tab uses a smaller gap, smaller side padding and a narrower badge. From 360 px up the old spacing comes back, so wider screens look the same.

## Files Modified

| File | Change |
|------|--------|
| src/components/library/exercise-library.tsx | `min-[360px]:` steps for the tab gap, padding and badge padding |

## Patterns Discovered

None.

## Follow-Up

None. Checked in headless Chrome at 320, 360 and 390 px: /, /vocabulary, /arena, /review, /exercises, /grammar, /irregular-verbs, /hard-words, /settings, /profile and /credits all have scrollWidth equal to clientWidth. lint, typecheck, 1198 unit tests and the build pass.

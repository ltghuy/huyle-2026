---
slug: wider-content
completed: 2026-10-21
---

# Summary: Widen the page content column

## What Changed

Changed the content wrapper in the playground layout from `max-w-5xl` (64rem) to `max-w-7xl` (80rem). Every page under `(playground)` renders inside that wrapper, so they all get the wider column on large monitors.

## Files Modified

| File | Change |
|------|--------|
| src/app/(playground)/layout.tsx | `max-w-5xl` to `max-w-7xl` on the content wrapper |

## Patterns Discovered

None

## Follow-Up

Long paragraphs now run wider on big screens. If they get hard to read, cap the prose blocks (for example `max-w-prose` on the intro and guide text) and leave the demos at full width.

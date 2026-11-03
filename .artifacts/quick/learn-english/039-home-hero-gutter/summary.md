---
slug: home-hero-gutter
completed: 2026-11-03
---

# Summary: Home hero lines up with the page gutter

## What Changed

The hero grid no longer has `mx-auto max-w-6xl`. On wide screens its text now starts on the page gutter like the sections below, and the owl sits on the right, pulled in 3 rem from `lg` and 6 rem from `xl` so it does not hug the edge.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/home/home-hero.tsx | hero grid drops the centred max width; owl right margin |
| .artifacts/features/learn-english/021-graduate-owl/spec.md | AC-003 note on the gutter |

## Patterns Discovered

None.

## Follow-Up

None.

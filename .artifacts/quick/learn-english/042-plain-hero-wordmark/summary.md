---
slug: plain-hero-wordmark
completed: 2026-11-03
---

# Summary: Home hero wordmark without the gradient

## What Changed

The hero `h1` no longer has `bg-linear-to-r/increasing from-primary to-streak bg-clip-text text-transparent`. It also loses the `w-fit` / `mx-auto` / `lg:mx-0` sizing, which only kept the gradient box as wide as the word. The parent's `text-center lg:text-left` still aligns it.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/home/home-hero.tsx | plain `h1` |
| .artifacts/features/learn-english/019-home-landing/spec.md | AC-001, AC-006 and the style note no longer mention the gradient |

## Patterns Discovered

None.

## Follow-Up

None.

---
slug: greeting-wave
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Quick Task: 👋 before the home greeting

## What

Put a waving-hand emoji before "Chào {tên}!" on the home screen, and make the greeting a little larger.

## Files

- `src/components/lesson/today-lesson.tsx`
- `src/app/globals.css` (`animate-wave`)

## Expected Outcome

The greeting reads "👋 Chào {tên}!" at text-xl semibold. The hand waves twice when the page opens (not with reduced motion) and is hidden from screen readers, so they still read "Chào {tên}!".

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

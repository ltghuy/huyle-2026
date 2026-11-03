---
slug: plain-hero-wordmark
status: done
branch: main
created: 2026-11-03
---

# Quick Task: Home hero wordmark without the gradient

## What

The "Streak Daily" `h1` in the home hero loses its `primary` → `streak` gradient and is drawn in the plain foreground colour, like the other page headings. Changes feature 019 AC-001 and its style note.

## Files

- apps/learn-english/src/components/home/home-hero.tsx: drop the gradient and clip classes from the `h1`

## Expected Outcome

"Streak Daily" reads in the foreground colour in light and dark themes, at the same size, weight and position as before.

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm test

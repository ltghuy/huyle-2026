---
slug: cat-greeting
status: done
branch: main
created: 2026-11-15
---

# Quick Task: The home cat greets the learner; the header keeps only the bell and the picture

## What

The home cat's bubble says "Xin chào {tên}!" and, on a second line, "Cùng cải thiện tiếng Anh nhé!" ("Xin chào!" for guests), and the "👋 Chào {tên}!" greeting leaves the top-right pill.

## Files

- apps/learn-english/src/components/home/mascot-showcase.tsx
- apps/learn-english/src/components/shell/account-link.tsx
- apps/learn-english/src/app/globals.css (the unused wave animation)

## Expected Outcome

The top-right pill shows the bell and the avatar only. On the home page (from `lg`, where the bubble shows) the cat greets a signed-in learner by the name they chose, else their Google name. Specs 003 AC-006, 021 AC-003, 022 AC-002 and 031 AC-022 are updated.

## Quality Gates

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test

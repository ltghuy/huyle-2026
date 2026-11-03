---
slug: home-hero-gutter
status: done
branch: main
created: 2026-11-03
---

# Quick Task: Home hero lines up with the page gutter

## What

On wide screens the hero sat in a centred `max-w-6xl` box, so its text started about 260px further in than "Bài học hôm nay" and the sections below. Drop the cap so the hero uses the same `px-4 md:px-8` gutter. Adjusts feature 021 AC-003.

## Files

- apps/learn-english/src/components/home/home-hero.tsx: remove `mx-auto max-w-6xl` from the hero grid; owl gets `lg:mr-12 xl:mr-24`

## Expected Outcome

From `lg` the badge, wordmark, tagline and buttons start at the same left edge as "Hôm nay". The owl sits a little in from the right edge (3 rem from `lg`, 6 rem from `xl`). Below `lg` nothing changes, since the stacked layout is still centred.

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm test

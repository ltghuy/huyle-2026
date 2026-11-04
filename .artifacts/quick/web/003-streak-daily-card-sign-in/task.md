---
slug: streak-daily-card-sign-in
status: done
branch: main
created: 2026-11-04
---

# Quick Task: Streak Daily card mentions Google sign-in

## What

The Streak Daily card in the Projects section still said there are no accounts and progress syncs with a code. Since release 1.0.2 (learn-english feature 022) learners sign in with Google. Update the description in English and Vietnamese.

## Files

- `apps/web/src/content/projects.ts`
- `apps/web/src/content/vi.ts`

## Expected Outcome

The card's last sentence says that signing in with Google keeps progress the same on every device, in both languages.

## Quality Gates

- `pnpm --filter web lint`
- `pnpm --filter web typecheck`
- `pnpm --filter web test`

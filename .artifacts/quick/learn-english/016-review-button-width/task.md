---
slug: review-button-width
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: Don't stretch the Ôn tập button

## What

On /review, size the "Ôn tập N mục" button to its text from the `sm` breakpoint up instead of stretching it across the card.

## Files

- `apps/learn-english/src/components/review/review-overview.tsx`

## Expected Outcome

On tablets and desktops the button is as wide as its label plus `px-8`, like the grammar topic's "Luyện tập" button; on phones it stays full width.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

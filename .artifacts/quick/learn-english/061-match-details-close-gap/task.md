---
slug: match-details-close-gap
status: done
branch: main
created: 2026-11-09
---

# Quick Task: Keep the match details header clear of the close button

## What

The "Kết bạn" button in the match details dialog header runs into the dialog's close button; reserve room for the close button.

## Files

- apps/learn-english/src/components/arena/match-details.tsx

## Expected Outcome

The friend button ends about 12px before the close button, which stays alone in the top right corner.

## Quality Gates

Run after the change, before marking done:

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test

---
slug: home-card-count-green
status: done
branch: main
created: 2026-10-25
---

# Quick Task: Move the green from the progress bar to the done count on the home page cards

## What

On the home page section cards, give the progress bar fill its default `primary` color again (near white in dark mode) and draw the done count, the first number in "14 of 14", in green.

## Files

- src/app/(playground)/page.tsx
- .artifacts/features/048-home-hub-links/spec.md (AC-002)

## Expected Outcome

The progress fill uses `primary`, near white in dark mode and near black in light mode. In "14 of 14 practices built" only the first number is green; "of 14" stays in the foreground color and the noun stays muted. The icon tile, "Open" label and hover border stay green.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

---
slug: home-cards-green
status: done
branch: main
created: 2026-10-25
---

# Quick Task: Use the green accent on the home page section cards

## What

Color the section cards on the home page with the site's green (the `success` token, the same green as text links) in both themes.

## Files

- src/app/(playground)/page.tsx
- .artifacts/features/048-home-hub-links/spec.md (AC-002 and AC-006)

## Expected Outcome

On every section card the icon sits on a light green tile and is drawn in green. On cards that link to a section, the progress bar fill and "Open →" are green, and the border turns green on hover. Titles, summaries and the count keep their colors, and "Coming soon" cards keep their dashed neutral border.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

---
slug: appbar-github-link
status: done
branch: main
created: 2026-10-25
---

# Quick Task: Add a GitHub link to the top bar

## What

Add an icon button to the left of the theme button in the top bar that opens https://github.com/ltghuy/react-mastering in a new tab.

## Files

- src/components/playground/github-link.tsx (new)
- src/components/playground/top-bar.tsx
- .artifacts/features/001-practice-playground/spec.md (new AC-027)

## Expected Outcome

The top bar shows a GitHub icon button between the search box and the theme button, with the same size and ghost style as the theme button. Activating it opens the repository in a new tab, and assistive technology announces it as a link to the source code on GitHub that opens in a new tab. lucide-react 1.x has no brand icons, so the GitHub mark is an inline SVG.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

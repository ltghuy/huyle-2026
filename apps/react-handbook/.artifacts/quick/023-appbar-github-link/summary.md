---
slug: appbar-github-link
completed: 2026-10-25
---

# Summary: Add a GitHub link to the top bar

## What Changed

The top bar has a GitHub icon button between the search box and the theme button. It opens https://github.com/ltghuy/react-mastering in a new tab (`rel="noopener noreferrer"`), and its accessible name says it opens in a new tab. It's a plain `<a>` styled with the ghost icon button variant at the theme button's size, so it stays a Server Component. lucide-react 1.x ships no brand icons, so the GitHub mark is an inline SVG.

## Files Modified

| File | Change |
|------|--------|
| src/components/playground/github-link.tsx | New: the GitHub link and its icon |
| src/components/playground/top-bar.tsx | Link placed before the theme button |
| .artifacts/features/001-practice-playground/spec.md | New story and AC-027 |

## Patterns Discovered

None

## Follow-Up

None

---
slug: home-page-content
status: done
branch: main
created: 2026-10-12
---

# Quick Task: Expand the home page with why, benefits, how it's built and references

## What

Add sections to the handbook home page that explain why it was made, what a reader gets from it, how the site is built, and where to read further, keeping the existing intro, "How to use it" and section cards.

## Files

- src/app/(playground)/page.tsx
- .artifacts/features/react-handbook/001-practice-playground/spec.md (AC-014)

## Expected Outcome

`/` reads top to bottom as: intro → why it exists → what you get → how to use it → sections → how it's built → references. External links open in a new tab with a screen-reader hint, styled like the topic pages' links. Server Component only, no new client JS.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

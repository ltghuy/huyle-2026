---
slug: wide-screen-grids
status: done
branch: main
created: 2026-10-21
---

# Quick Task: Fill the wider column on the home and section index pages

## What

Add wide-screen grid columns to the home page and the section index pages so they don't leave large empty areas now that the content column is 80rem.

## Files

- src/app/(playground)/page.tsx
- src/components/playground/section-index.tsx

## Expected Outcome

From the `xl` breakpoint, the home page shows "Why it exists" as three columns, section cards three per row, and "How this site is built" next to "References". From `2xl`, the four benefit cards sit in one row. Section index pages show three cards per row from `xl`. Below `xl`, both pages look the same as before.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

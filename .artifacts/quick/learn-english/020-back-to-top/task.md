---
slug: back-to-top
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: "Lên đầu trang" button

## What

Add a button that scrolls the page back to the top, shown once the learner has scrolled down, on every page with navigation.

## Files

- `apps/learn-english/src/components/shell/back-to-top.tsx` (new) and its test
- `apps/learn-english/src/app/(app)/layout.tsx`
- `apps/learn-english/src/components/grammar/grammar-topic.tsx` (marks its sticky action bar)

## Expected Outcome

After about a screen of scrolling (600px), a round arrow button labelled "Lên đầu trang" fades in at the bottom right. It scrolls smoothly to the top, or jumps when the learner prefers reduced motion. On phones it sits above the bottom nav, and above a page's sticky action bar when there is one. While hidden it can't be focused or clicked.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

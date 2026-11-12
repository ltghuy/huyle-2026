---
slug: community-states-alignment
status: done
branch: main
created: 2026-11-12
---

# Quick Task: Line up "Cộng đồng" empty, loading and error states with the filters

## What

The empty state on `/arena/community` sat inset from the filter bar and the rows, because the shared load states add the page gutter (`mx-4 md:mx-8`) themselves, and this page already has one.

## Files

- `apps/learn-english/src/components/shell/load-states.tsx`
- `apps/learn-english/src/components/arena/community-list.tsx`

## Expected Outcome

- `ListSkeleton`, `ContentError` and `EmptyState` take an optional `className` (merged with `cn`); without it every other page looks as before
- On `/arena/community` the three states span the same width as the filter bar and the room rows

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

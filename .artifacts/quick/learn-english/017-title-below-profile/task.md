---
slug: title-below-profile
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: Page title below the greeting and profile link

## What

On desktop, put the page title (for example "Bài học hôm nay") on its own row below the pinned greeting and profile pill instead of on the same line.

## Files

- `apps/learn-english/src/components/shell/page-header.tsx`

## Expected Outcome

At `md` and up the header leaves the pill's row empty and starts the title below it, as phones already do; the title can use the full width.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

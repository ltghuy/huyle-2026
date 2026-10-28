---
slug: blurred-top-band
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: Blurred band behind the greeting at the top

## What

Add a translucent, blurred band across the top of the content area, behind the pinned greeting and profile pill, so content that scrolls up under it is blurred.

## Files

- `apps/learn-english/src/components/shell/account-link.tsx`

## Expected Outcome

At the top of a page the band covers only the room PageHeader leaves for the pill (4.25rem on phones, 4.75rem from `md`). When the page scrolls, content passing under it is dimmed and blurred, with a soft fade at its bottom edge. The band takes no clicks.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

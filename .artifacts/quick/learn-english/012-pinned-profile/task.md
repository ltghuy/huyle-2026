---
slug: pinned-profile
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: Keep the greeting and profile link pinned to the top-right corner

## What

Keep "👋 Chào {tên}!" and the profile link in the top-right corner while the page scrolls, instead of scrolling away with the page header (quick task 010).

## Files

- `src/components/shell/account-link.tsx`: a sticky overlay in a pill with a blurred background
- `src/app/(app)/layout.tsx`: render it once for every page with navigation
- `src/components/shell/page-header.tsx`: stop rendering it; keep room for it (a top row on phones, right padding from `md`)

## Expected Outcome

On every page with navigation, the greeting and the round profile link sit in the top-right corner at all scroll positions, on phones and desktop, with a translucent blurred background so they stay readable over content. At the top of a page the header looks as before: on phones the title starts below the corner pill, and from `md` the title and description never run under it. The tour's "Hồ sơ" step still points at the link. Pages without navigation (lesson, review session, placement) don't show it.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`

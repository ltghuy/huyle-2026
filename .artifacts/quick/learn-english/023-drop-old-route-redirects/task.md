---
slug: drop-old-route-redirects
status: done
branch: feature/learn-english
created: 2026-10-29
---

# Quick Task: Drop the old Vietnamese route redirects

## What

Remove the 308 redirects from the Vietnamese routes and query keys (quick 002) and tidy `next.config.ts`.

## Files

- `apps/learn-english/next.config.ts`
- `.agents/knowledge.md` (the quick 002 entry)

## Expected Outcome

`next.config.ts` keeps only the version env and the API noindex header. Old Vietnamese URLs such as `/tu-vung` or `/ngu-phap?bai=x` return 404. They were public for about a day (first deploy 2026-10-26, rename 2026-10-27) and nothing in the app or tests links to them (owner, 2026-10-29).

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

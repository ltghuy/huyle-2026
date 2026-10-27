---
slug: content-json-passthrough
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Quick Task: Serve content bodies without decoding them, and publish chosen levels only

## What

`GET /api/content/items` copies each item's stored JSON body straight into the response instead of parsing and re-serializing it, and `content:publish` takes `--levels` so B1 can go live while B2 stays unpublished.

## Files

- `apps/learn-english/src/server/content/content.service.ts`
- `apps/learn-english/src/server/content/content.service.test.ts`
- `apps/learn-english/src/app/api/content/items/route.ts`
- `apps/learn-english/src/app/api/content/items/route.test.ts`
- `apps/learn-english/scripts/publish-content.ts` (+ test)

## Expected Outcome

The response is unchanged for clients (same JSON shape). An uncached B1 sentence response (4,926 items, about 3.6 MB) costs well under the free plan's 10 ms of CPU for the JSON work, measured before and after. `content:publish --levels A1,A2,B1` upserts only those levels and never tombstones items of other levels.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

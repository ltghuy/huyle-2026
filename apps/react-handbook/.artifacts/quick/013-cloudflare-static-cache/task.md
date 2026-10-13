---
slug: cloudflare-static-cache
status: done
branch: main
created: 2026-10-13
---

# Quick Task: Serve prerendered pages from the static-assets incremental cache

## What

Configure OpenNext's `staticAssetsIncrementalCache` (plus cache interception) so prerendered pages and their RSC payloads come from the build output instead of being re-rendered by the Worker on every request.

## Files

- open-next.config.ts

## Expected Outcome

With no incremental cache set, OpenNext falls back to `"dummy"`, so every request re-renders the page (`x-nextjs-cache: MISS`). Bursts of sidebar prefetches on heavy handbook pages then exceed the Worker's CPU limit, and Cloudflare answers with a 503 error page. After the change, page and `?_rsc=` responses are served from cache (`x-nextjs-cache: HIT`) and stop failing under prefetch bursts. API routes keep working unchanged. Every page is static; nothing uses ISR or revalidation, which this read-only cache doesn't support.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build
- pnpm exec opennextjs-cloudflare build (cache files land in `.open-next/cache`)

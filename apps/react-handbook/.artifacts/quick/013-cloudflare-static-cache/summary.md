---
slug: cloudflare-static-cache
completed: 2026-10-13
---

# Summary: Serve prerendered pages from the static-assets incremental cache

## What Changed

`open-next.config.ts` used to call `defineCloudflareConfig()` with no options, so OpenNext used its `"dummy"` incremental cache. The Worker re-rendered every prerendered page and every `?_rsc=` prefetch (`x-nextjs-cache: MISS` in production). Hovering the sidebar sends bursts of prefetches for heavy handbook pages, which pushed the Worker past its resource limit, and Cloudflare returned its own 503 HTML page. The site now uses `staticAssetsIncrementalCache` with `enableCacheInterception: true`. `opennextjs-cloudflare deploy`/`preview` copy `.open-next/cache` into the Workers assets (`cdn-cgi/_next_cache`), and the Worker serves pages and RSC payloads from there without booting the Next server. Checked in local workerd preview: the document, RSC and segment-prefetch requests for `/under-the-hood/transpiling` and `/system-design` return `x-opennext-cache: HIT`, `/api/health` still returns 200, and an unknown path still returns 404.

## Files Modified

| File | Change |
|------|--------|
| open-next.config.ts | Set `incrementalCache: staticAssetsIncrementalCache` and `enableCacheInterception: true` |

## Patterns Discovered

Recorded in `.agents/knowledge.md` (Gotchas): this cache is read-only, so adding ISR/`revalidate` later needs the R2 incremental cache.

## Follow-Up

- Deploy (`pnpm deploy`), then check that production `?_rsc=` responses carry `x-opennext-cache: HIT` and that sidebar prefetch bursts no longer 503.
- The inert Cloudflare Cache Rule from the reverted proxy experiment can still be deleted.

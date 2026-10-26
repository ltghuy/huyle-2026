---
id: "012"
feature: lazy-images
audited: 2026-10-08
result: passed
---

# Audit: Lazy-Loaded Images

Evidence from three sources. API checks ran with curl against the dev server. UI checks ran in headless Chrome (Puppeteer, visible single-tab page, 1280×900 at DPR 1 and 2, and 360×800), first on `next dev`, then the numbers below were re-measured on a production build (`pnpm build && pnpm start`). Server counters are the route's own per-run stats. Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Below-the-fold images not requested until within the band; hand-built requests ≤ visible + band on first view, eager requests everything | Met | See SC1. Scrolling slowly, requests grow row by row and end at 48 requests for 48 shown, 0 cancelled |
| G2: Placeholder in final shape; reserved space = zero shift; turning it off shows a measured shift | Met | See SC2; screenshots of blur-up placeholders at final aspect ratio with 3000 ms latency |
| G3: Failures visible and recoverable; fast-scrolled images skipped or cancelled | Met | See SC3, SC4, SC5; 100 % failure: 48 of 48 tiles show "Couldn't load" + Retry, live region "48 images couldn't load. Latest: Calm Peaks.", page stays usable |
| G4: Compare hand-built, native lazy and eager with live measured numbers | Met | Counters (requests, KB, cancelled, failed from the server stream; shown, skipped, visible ready, layout shift from the page) and the results table with one row per strategy, e.g. first view: Hand-built 6 / 69 KB, Native 9 / 103 KB, Eager 48 / 527 KB |
| SC1: Default settings, first view: hand-built ≤ 12 of 48, eager 48 | Met | Production: hand-built 6 requests (6 visible, 3 priority, band 200 px), native 9, eager 48. At 360 px: hand-built 8 |
| SC2: Full scroll with reserve on: 0.00 for every strategy; off: > 0 | Met | Gallery in view, scrolled to the end: reserve on → hand-built 0.000, native 0.000, eager 0.000; reserve off → hand-built 0.210, native 0.096, eager 0.064 |
| SC3: Fly through, hand-built + 150 ms delay requests ≥ 50 % fewer than native | Met | Production, 600 ms latency: hand-built 12 requests (36 skipped), native 48 requests → 75 % fewer |
| SC4: Each request counted once (no duplicate on reveal); each cancel reaches the server | Met | Full slow scroll, hand-built: 48 requests = 48 shown (reveal reuses the preloaded URL). Fly through at 3000 ms latency with no start delay: 48 requests, 38 cancelled by the server, 9 shown, 1 in flight. Curl with `--max-time 1` on a 3000 ms image: `cancelled: 1`. Switching from eager mid-load: the eager run's 5 in-flight requests are recorded as cancelled |
| SC5: 30 % failure: every failed tile recovers with Retry; "Retry failed" at 0 % leaves 0 failed | Met | Run 1: 12 failed tiles, per-tile Retry rounds (3) until 0 left, 48/48 shown. Run 2: 22 failed tiles; rate set to 0, "Retry failed" → 70 requests, 48/48 shown, 0 Retry buttons left |
| SC6: Zero serious/critical a11y issues in both themes; no horizontal scroll at 360 px | Met | axe-core 4.10.2, guide expanded: 1280 px light and dark, at rest and with failed tiles under Native: only `region` (moderate, sidebar `.peer`, carried over from 001). 360 px: first run found `scrollable-region-focusable` (results table scroller), fixed by making it a labelled focusable region; re-run: 0 violations light and dark. `scrollWidth` 360 at 360 px |

## Known minor issues (not blocking)

- One axe run at 360 px in light mode reported 3 transient `color-contrast` nodes while images were fading in right after the theme switch; two re-runs a second later reported none.
- Not verified in a real browser setting: reduced-motion behavior (no fade, static skeleton, instant fly-through) and keyboard scrolling of the gallery viewport; both checked by code inspection (`motion-safe:`/`motion-reduce:` classes, `matchMedia` check, `tabIndex={0}` region). The Puppeteer MCP has no reduced-motion emulation and no real keyboard.
- Native lazy distance and time-to-visible depend on the browser: hand-built's "visible ready" isn't faster than native here (both share ~5 free connections after the stats stream), so the guide talks about requests and bytes, not speed, as the main win.
- Layout shift is only scored while the gallery is on screen (browser behavior); the counter's tooltip and the guide say so.
- Failure injection is random per request; observed failure shares varied between 25 % and 46 % at 30 %.

> Structural changes detected -- consider running `/project-index re-index` to refresh `.agents/codebase/*.md`.

---
id: "013"
feature: debounced-search
audited: 2026-10-08
result: passed
---

# Audit: Debounced Search + API Cache

Evidence from three sources. Engine and cache logic ran as a Node script (jiti) against the real modules with a fake fetcher (controllable per-query latency, abortable, injectable failures) and an injected cache clock. UI checks ran on the dev server (port 3113) in headless Chrome through the Puppeteer MCP (visible page, real timers); request counts come from the Performance API `resource` entries for the search endpoint, not from the app's own counters. The API was checked with `curl`. Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: One request after a pause, not one per keystroke; skipped keystrokes visible | Met | See SC1; the timeline listed the 6 cancelled waits as "Debounced de … desk lam" with their durations |
| G2: Shown results always belong to the latest query once settled, even out of order | Met | See SC2 and SC4 |
| G3: Recent query instant from a bounded, expiring cache, refreshed in the background when old | Met | See SC3. SWR: with fresh time 5 s, "brass" re-searched after 5.2 s produced a "Refresh · Shown brass" row (1 request). LRU: cache size 5, six queries → inspector listed bowl, kettle, vase, sofa, rug (mug evicted). Errors not cached (script). Entries survived navigating to practice 2 and back via the sidebar (same 5 keys) |
| G4: Each technique can be switched off to reproduce its bug, cause visible in the timeline | Met | Debounce off → 7 requests (SC1). Naive preset with "shorter queries slower" → bars finishing out of order and the warning "The list shows results for “des”, but the box says “desk lamp”" (SC2). Cache off → every robot run went to the network (201 requests over 20 runs, 0 cache hits added). Abort off + guard on → 113 "Stale, dropped" rows, 0 mismatches |
| G5: Fully keyboard-operable, screen-reader-friendly combobox | Met | See SC5 and SC6 |
| SC1: Robot "desk lamp" fast, defaults, empty cache → exactly 1 request; debounce off → 7 | Met | Browser: 1 network request (debounced 6), then with debounce off 7 network requests (`de`, `des`, `desk`, `desk l`, `desk la`, `desk lam`, `desk lamp`; 6 aborted). Script: identical counts |
| SC2: Guard on → 0 mismatches in 20 robot runs (debounce off, shorter-slower); abort + guard off → warning in ≥ 1 run | Met | Guard on, abort off, cache off: 20 of 20 runs ended on "20 of 144 results for desk lamp", no warning. All techniques off: 4 of 10 runs ended on another query (“de”, “des”, “desk”) with the mismatch warning shown |
| SC3: Fresh cached query shown in < 50 ms with 0 requests | Met | After the fresh-hit change, typing back to "walnut" updated the status within the 30 ms pause of the test helper (measured 51 ms including that pause, so < 21 ms), with 0 network requests and a "Cache hit walnut" row. Before the change it took ~350 ms (the debounce), which led to the decision recorded in decisions.md |
| SC4: Script, 200 random typing / out-of-order sequences with the guard on → shown = last query every time | Met | 200 of 200 runs (random debounce, cache and abort settings, random latencies 0–60 ms, 10% failures): settled display (results or error) always for the box's key, mismatch never flagged. Controls: abort-only 0 of 60 (aborted fetches never resolve), naive 19–29 of 60 mismatches |
| SC5: Every search interaction works with the keyboard alone | Met | Dispatched keydown on the input (handled with `preventDefault`, so no real keyboard needed): ↓ highlighted option 0 with `aria-activedescendant` and `aria-selected`; ↑ wrapped to option 19, then 18; Enter picked "Classic Oak Mirror" into the Picked card; Escape set `aria-expanded=false`; ↓ reopened; Escape twice cleared the box and the URL; Enter on "walnut" searched with no waiting bar. Clear, Retry, example queries and robot controls are native buttons (focusable, Enter/Space) by inspection |
| SC6: 0 serious/critical accessibility issues both themes; no horizontal scroll at 360 px | Met | axe-core 4.10.2: 0 serious/critical in light and dark with a highlighted option, mismatch warning, open guide; again with the error alert and timeline rows of pending, aborted and shown. At 360 px: `scrollWidth` 360, no element past the viewport outside the cache table's own scroller |

## Known minor issues (not blocking)

- axe `region` (moderate) on the page itself, carried over from feature 001.
- Back/Forward don't step through queries (by design: `replaceState`, see decisions.md).
- In the naive preset every response is labelled "Shown" in the timeline, because each did replace the list when it arrived; the mismatch warning tells which one stayed.
- Keyboard checks used dispatched events (the Puppeteer MCP has no real keyboard); Tab order between controls was checked by inspection, not by pressing Tab.

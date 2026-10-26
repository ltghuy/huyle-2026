---
id: "015"
feature: large-dataset-performance
audited: 2026-10-08
result: passed
---

# Audit: Large Dataset Performance Optimization

Evidence from three sources. Feed and filter/sort logic ran as a Node script (`--experimental-strip-types`) against copies of the real modules. UI checks ran on a production build (`pnpm build && pnpm start -p 3123`) in headless Chrome through Puppeteer scripts with real keyboard and mouse input, reading the page's own measurement panel and benchmark table, plus Long Tasks and Event Timing observers injected for tracing. The API was checked with `curl`. Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass. Numbers are from one development machine; they vary between runs and devices.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Each of five optimizations switchable, effect visible in live measurements | Met | Windowing: rows in the page 20,000 → 21. Memoized rows: rows re-rendered per feed update 21 → 0–4; per row click 21 → 2. Cached filter & sort: with a sort active and the feed paused, clicking rows left "Filter + sort" unchanged (6.2 ms) and render 0.8 ms; without it every click re-sorted (9.0 ms, render 10 ms). Deferred filtering (windowing and memo off): typing delay per key 190–250 ms (off) vs 1–23 ms (on), "updating…" cue shown. Indexed updates: applying 2,000 updates at 50,000 rows 0.5 ms (index) vs 212 ms (scan) |
| G2: Repeatable benchmark, naive vs optimized side by side | Met | Benchmark table after Naive, Optimized (20,000) and Optimized (50,000) runs; best value per column marked "best"; seeded feed; Stop ends a run without adding a result and re-enables the controls |
| G3: Smooth at 50,000 rows with all optimizations on | Met | See SC2 |
| G4: Never stuck with a frozen tab | Met | Windowing off at 50,000 asks "Render every row?… may freeze for several seconds"; "Keep windowing" kept all five on. After confirming, a 1,056 ms update paused the feed with "An update took 1056 ms (over 1000 ms), so the feed was paused…" and Resume; the feed also pauses while the tab is hidden |
| SC1: Median render, 20,000 rows, all on ≥ 10× lower than all off | Met | Benchmark: Naive 275 ms vs Optimized 3.7 ms (74×); p95 1,700 vs 21 ms; blocking time 9,619 vs 16 ms; 10 vs 60 fps |
| SC2: All on at 50,000 rows: worst typing delay < 100 ms, average fps > 50 | Met | Benchmark: worst typing delay 77 ms, 60 fps, median render 2.3 ms |
| SC3: Memoized rows: a feed update re-renders no more rows than are visible | Met | 12 samples during 2,000-row updates: 0, 0, 3, 3, 1, 1, 4, 4, 2, 1, 1, 2 rows (21 in the page); with it off, 21 every time |
| SC4: 50 random combinations show identical rows, order, values | Met | Feed paused, filter "bank", sorted by Change % descending, a row selected: 50 of 50 random combinations gave the same text for rows 2–14 and 44–50 (after scrolling), the same count and the same selected row |
| SC5: 0 serious/critical a11y issues both themes; no horizontal page scroll at 360 px | Met | axe-core 4.10.2 with a selected row, a sort, a benchmark result row: 0 serious/critical in light and dark (after darkening warning text in light mode, which first failed `color-contrast`). 360 px: document `scrollWidth` 360; the board scrolls inside its own box (292 px wide, 856 px content) |

## Known minor issues (not blocking)

- axe `region` (moderate) on the page itself, carried over from feature 001.
- The 50,000-row dataset is 7.4 MB of uncompressed JSON (the route isn't compressed by `next start`); the guide's trade-offs mention it.
- Page-side render timing doesn't include the browser's style, layout and paint; frame rate and long tasks cover that part.
- The benchmark's "best" marks compare all rows, including runs with different dataset sizes; the panel tells the learner to compare runs of the same size.

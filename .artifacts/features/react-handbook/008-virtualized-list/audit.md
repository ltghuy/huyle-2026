---
id: "008"
feature: virtualized-list
audited: 2026-10-07
result: passed
---

# Audit: Virtualized Large Lists

Evidence from the T009 runs on a production build (`next build && next start`) driven by headless Chrome scripts, plus a Node script for the virtualizer, Fenwick tree and view logic. Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: 100k variable rows scroll smoothly with a small, configurable DOM | Met | See SC1 and SC2; overscan 0 / 5 / 20 gave 6 / 11 / 26 rows on the page |
| G2: The view never jumps on its own | Met | 0 px drift scrolling up and down with estimates of 40 and 200 px; width resize, mode switch, debug toggle and filter/sort all kept the reference row within 1 px |
| G3: Keyboard and screen reader access to every row | Met | Arrows, Page Up/Down, Home/End, Enter/Space in both modes; options carry posinset/setsize of the whole list (e.g. 1/10000); active row stays in the DOM after mouse-scrolling away; see SC5 and SC6 |
| G4: The learner can see the difference | Met | Live stats (rows on page, in list, visible range, last update with cause, measured); debug view labels each row "measured"/"est." and tints overscan rows; see SC4 |
| SC1: Rows on page ≤ visible + 10 + 1 at 100k | Met | 0 violations over a 5 s scroll, 300 held-Down presses and 20 jumps (max 19 rows) |
| SC2: 5 s scroll at 100k: no task > 50 ms, no blank box | Met | 0 long tasks (two runs); viewport fully covered after jumps to 10%, 33%, 50%, 90%, 100% |
| SC3: 10 random jumps land within 1 px | Met | 20 jumps across two runs: 0 px off; rows near the end are bottom-aligned as AC-018 allows |
| SC4: Virtualized first render ≥ 10× faster than naive at 10k | Met | Naive 497.6 ms (mode switch) vs virtualized 5–6 ms (new list): ≈ 80× |
| SC5: Holding Down 1 → 300 never loses focus; active row fully visible | Met | 3 key presses per frame: 0 focus losses, 0 frames with the active row clipped |
| SC6: 0 serious/critical a11y issues, both themes | Met | axe-core 4.10.2: 0 serious, 0 critical for virtualized, virtualized + debug, and naive (1,000 rows), light and dark; 1 moderate `region` (pre-existing from 001) |

## Known minor issues (not blocking)

- The naive-mode axe run used 1,000 rows: at 10,000 rows axe exceeded the browser tool's timeout. The markup is identical at any size.
- Switching naive → virtualized reports ~63 ms because it includes removing the naive rows; the guide says so.
- Filtering down to no matches and back remounts the list at the top, so the selected row isn't kept in place across an empty result.
- Momentum-scroll interruption on mobile Safari when `scrollTop` is corrected is noted in the guide but wasn't tested on a device.
- axe `region` (moderate) carried over from feature 001.

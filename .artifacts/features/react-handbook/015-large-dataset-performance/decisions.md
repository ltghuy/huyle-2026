---
id: "015"
feature: large-dataset-performance
created: 2026-10-08
---

# Decisions: Large Dataset Performance Optimization

Decisions on gray areas and ambiguities. This feature was built by an agent
without a discussion round, so every decision below was a default chosen by
the agent and is marked "(agent default, not asked)" for the user to review.

## Resolved

### Scenario

- **Question:** What large dataset does the practice render? (agent default, not asked)
- **Decision:** A live market board: instruments with symbol, name, sector, price, change %, volume and last update time, generated deterministically by the mock API (5,000 / 20,000 / 50,000; default 20,000). A simulated feed in the browser updates a batch of random instruments on an interval (default 200 rows × 2 per second).
- **Rationale:** Live updates are what make large lists expensive in practice (the same rows re-render again and again); filter, sort and select cover the other typical renders. A browser-side feed keeps runs repeatable and avoids streaming plumbing that practice 5 already covers.
- **Caveats:** The feed's randomness is seeded per run so the benchmark replays the same updates.

### The five optimizations

- **Question:** Which techniques are switchable? (agent default, not asked)
- **Decision:** (1) Windowing with fixed-height rows; (2) memoized rows: `memo` rows with stable callbacks and immutable per-row updates; (3) cached filter and sort: `useMemo` on data/filter/sort; (4) deferred filtering: `useDeferredValue` for the query; (5) indexed updates: a `Map` from id to position instead of `findIndex` per changed row. Presets "Naive" (all off) and "Optimized" (all on).
- **Rationale:** Each removes a different kind of wasted work (rows not visible, rows not changed, repeated derivation, input blocked by rendering, quadratic lookups) and each is visible in a different metric.
- **Caveats:** Cached filter and sort can't help renders caused by data changes (the data changed); the guide says so, and the metrics show it.

### State lives in React here

- **Question:** Use a framework-free controller like practices 12 and 13? (agent default, not asked)
- **Decision:** No. The board's data, filter, sort and selection are ordinary React state, because the techniques being practiced (`memo`, `useMemo`, `useDeferredValue`, stable callbacks) are React rendering techniques. Only measurement lives outside React (a module-level metrics store), so recording a number never re-renders the board.
- **Rationale:** An external store would hide the very renders the practice measures.
- **Caveats:** None.

### Windowing implementation

- **Question:** Reuse practice 7's `Virtualizer`? (agent default, not asked)
- **Decision:** No: rows have one fixed height (36 px), so the visible range is `floor(scrollTop / rowHeight)` plus overscan, a few lines of code. The guide points to practice 7 for variable heights.
- **Rationale:** Practice 7's hook is tied to its list's stats, anchors and navigation; fixed heights need none of that, and the simple version shows that windowing itself is cheap math.
- **Caveats:** Changing row height would need practice 7's approach.

### Measurements

- **Question:** What is measured, and how? (agent default, not asked)
- **Decision:** Page-side timing of each update (see the amendment below) for render duration; a counter incremented by each row render for "rows re-rendered"; DOM row count; `performance.now()` around derivation and around applying an update; keystroke → next frame (keydown time to the next `requestAnimationFrame` callback; a first version also waited for a `MessageChannel` task after the frame and over-counted, see design.md) for typing delay; `PerformanceObserver` "longtask" for long tasks and total blocking time (sum of each task's time above 50 ms) over 10 s; a `requestAnimationFrame` loop for frame rate. The panel reads a module-level store and refreshes 4 times a second.
- **Rationale:** These are the numbers a real investigation uses (Profiler + Performance panel), available from page code; refreshing the panel on a timer keeps measuring cheap and independent of the board.
- **Caveats:** Long tasks are Chromium-only; numbers in development builds are several times higher than in production (the guide says so).
- **Amendment (design):** React's `<Profiler onRender>` doesn't run in production builds unless the app is built with `next build --profile`, which would slow every page. Render time is therefore timed by the page: start in the render body of the demo or the board (whichever renders first), end in the first layout effect after the commit. It covers filtering/sorting, rendering and the DOM commit, in development and production alike.

### Benchmark

- **Question:** What does a run do? (agent default, not asked)
- **Decision:** About 10 s, through the same handlers as the user: type "tech" one character per 150 ms, clear it, sort by Change % then Volume, select three rows, scroll the board top → bottom → top in steps, then 3 s of feed at fixed settings (200 rows × 4 per second, seeded). Results: configuration, rows, median and p95 render time, worst typing delay, long tasks, total blocking time, average fps, median rows re-rendered. Keeps the last 6 runs; best value per column marked with "best" text.
- **Rationale:** Covers every kind of render the toggles affect; fixed feed settings and seed make runs comparable.
- **Caveats:** Runs on a busy machine vary; the guide recommends comparing several runs.

### Safety

- **Question:** How is a frozen tab avoided? (agent default, not asked)
- **Decision:** Turning windowing off above 20,000 rows asks for confirmation through the playground's shared confirm dialog (practice 9). Any single render over 1 s pauses the feed with a notice and Resume. The feed also pauses while the tab is hidden.
- **Rationale:** The naive version must be demonstrable without making the page unusable.
- **Caveats:** The first naive render at 50,000 rows still takes seconds after confirming; that is the lesson.

### Accessibility of the board

- **Question:** Which semantics for a windowed table? (agent default, not asked)
- **Decision:** `role="table"` with `aria-rowcount` and `aria-rowindex` on rendered rows, `aria-sort` on sortable column headers (buttons), each row's symbol a button that selects it (`aria-pressed`). Price changes are not announced (too frequent); the selected instrument's details panel is a labelled region.
- **Rationale:** Practice 13 covers the full grid keyboard pattern; here a simple, correct table is enough and keeps the per-row cost honest.
- **Caveats:** Without windowing every row's button is a tab stop; part of the naive cost.

### Stable props for the memoized board (found during verification)

- **Question:** Why did deferred filtering not help at first? (agent default, not asked)
- **Decision:** Every prop of the memoized board is stable (`useCallback` handlers), and the "updating…" dimming lives on a wrapper element instead of a board prop.
- **Rationale:** Measured: with a new `onSort`/`onClearFilter` per render and a `stale` prop, each keystroke re-rendered all 20,000 rows in the urgent render (168 ms `input` event). After the fix, typing delay with deferral on is 1–23 ms vs 190–250 ms with it off (windowing and memoized rows off). This is the exact mistake the guide warns about, so the guide's Best practices keep it.
- **Caveats:** None.

## Tentative

- None.

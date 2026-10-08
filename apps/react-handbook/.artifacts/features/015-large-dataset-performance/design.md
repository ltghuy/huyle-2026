---
id: "015"
feature: large-dataset-performance
created: 2026-10-08
---

# Technical Design: Large Dataset Performance Optimization

## Scope

In scope: practice 14 page at `/react-practices/large-dataset-performance`,
mock API for the instrument dataset, a seeded browser feed, the board (filter,
sort, select, details) with five switchable optimizations, a measurement
layer independent of React rendering, the metrics panel, the benchmark
runner and results, safety guards, the guide, and the catalog flip to built.

Out of scope: see spec Out of Scope.

## Research Summary

- `<Profiler onRender>` is a no-op in production React unless the app is
  built with the profiling build (`next build --profile`, from
  `node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md`).
  Render cost is therefore timed by the page itself (see Decisions), which
  works in development and production builds alike.
- `useDeferredValue` renders the deferred value in a background,
  interruptible render; it only helps if the urgent render is cheap, i.e. the
  expensive subtree is memoized and receives the old (deferred) props during
  the urgent render.
- `PerformanceObserver` with type `longtask` is Chromium-only; feature-detect
  with `PerformanceObserver.supportedEntryTypes`.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Practice route | Own route folder, `PracticeFrame`, `practiceMetadata` | Serving from `[slug]` | src/app/(playground)/react-practices/data-grid/page.tsx:1 |
| Mock API | Thin route → zod → service, `jsonError` | Logic in routes | src/app/api/practices/data-grid/employees/route.ts:1 |
| Client-safe shared schema | `*.schema.ts` without `server-only` | Importing server modules in client | src/server/practices/data-grid/grid.schema.ts:1 |
| Text folding | Reuse `searchTerms`/`foldText` (generic, client-safe) | A third folding implementation | src/server/practices/data-grid/grid.query.ts:20 |
| Module store + `useSyncExternalStore` | Constant server snapshot | Measurements in React state | .agents/knowledge.md (feature 002 convention) |
| Shared confirm | `await confirm({...})` from practice 9 | shadcn Dialog | src/practices/accessible-modal/modal-store.ts:66 |
| Demo controls | Native `select`/`range` in `DemoControls` | Second component library | src/practices/data-grid/demo.tsx:115 |
| Scroll boxes | `relative isolate overflow-auto` | Non-positioned scroller with sr-only content | .agents/knowledge.md (feature 014 gotcha) |
| Handlers | Named `handleX`; inline only one-line calls | Multi-line inline handlers | .claude/rules/05-event-handlers.md |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `PracticeFrame`, `DemoControls`, `DemoStage`, guide blocks | src/components/playground/* | Page shell, guide |
| `searchTerms` | src/server/practices/data-grid/grid.query.ts:29 | Filter words, folded |
| `confirm` | src/practices/accessible-modal/modal-store.ts:66 | Windowing-off confirmation |
| `Button`, `Input`, `Progress` | src/components/ui/* | Actions, filter, benchmark progress |
| `jsonError` | src/lib/http.ts:5 | API errors |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| Instrument | One board row (new) |
| Update | One changed instrument in a feed update (new) |
| Optimizations | The five switches (new) |
| Metrics snapshot | What the panel shows (new) |
| Benchmark result | One run's summary (new) |
| Practice (catalog) | `built` flips to true -- src/practices/catalog.ts:156 |

#### Instrument (`instruments.schema.ts`)

- `id` (number, 0-based position in the dataset), `symbol` (string, unique, 3–5 letters + optional digit), `name` (string), `sector` (one of 11), `price` (number, 2 decimals), `change` (number, % since open, 2 decimals), `volume` (number), `updatedAt` (number, epoch ms)

#### Update (`feed.ts`)

- `id`, `price`, `change`, `volume`, `updatedAt`

#### Optimizations

- `windowing`, `memoRows`, `cachedDerive`, `deferredFilter`, `indexedUpdates` (booleans)

#### Metrics snapshot

- `lastRenderMs`, `avgRenderMs`, `maxRenderMs` (last 20), `rendersPerSec`, `rowsRendered`, `rowsInPage`, `deriveMs`, `updateMs`, `inputLastMs`, `inputMaxMs`, `fps`, `longTasks`, `blockingMs`, `longTaskSupported`

#### Benchmark result

- `id`, `config` (Optimizations), `rows`, `medianRenderMs`, `p95RenderMs`, `maxInputMs`, `longTasks`, `blockingMs` (null if unsupported), `fps`, `medianRowsRendered`

### Relationships

Updates reference instruments by `id`. The board's rows are a pure function
of (instruments, filter, sort). Selection is an instrument `id`.

### API Contracts

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/practices/large-dataset/instruments` | GET | `?size=5000\|20000\|50000` | `200 { data: Instrument[] }`; `422` invalid size |

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-001 | Symbol, Name, Sector, Price, Change %, Volume, Last update | none | no | must add (Instrument) |
| AC-013 | render last/avg/worst, renders/s, rows re-rendered, rows in page, derive ms, update ms | none | no | must add (metrics store) |
| AC-014 | typing delay last/worst | none | no | must add |
| AC-015 | fps, long tasks, blocking time | none | no | must add |
| AC-019 | result columns | none | no | must add (benchmark) |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Board state in React (`useState` in the demo); measurement in a module store read by the panel on a 250 ms timer | Optimizations under test are React techniques; recording a number must never re-render the board (AC-016) |
| Render timing by hand: `renderTimer.start()` in the demo's and the board's render body (first call wins), `renderTimer.end()` in the board's and the demo's layout effects (first call wins); duration = start → end | Works in production builds (no Profiler), covers derive + render + DOM commit; renders that skip the board still end in the demo's layout effect; board-only renders (scrolling) start in the board |
| Rows re-rendered: each row render increments a module counter, read and reset at `end()` | The number `memo` changes; a render-phase increment is acceptable for a measurement (React may render twice in Strict Mode development; the guide says so) |
| Typing delay: keydown stamps `performance.now()`; the next `requestAnimationFrame` callback (the frame that paints the keystroke) ends it | Approximates "keystroke to paint" (INP-like) from page code. The first version waited for a `MessageChannel` task after that frame and also counted unrelated long work queued behind it (found in verification) |
| Windowing: fixed 36 px rows; board-local `scrollTop` state; render rows `floor(scrollTop/36) − 8` … `+ viewport/36 + 8`, absolutely positioned in a spacer of `count × 36` px | Board-local state keeps scroll renders out of the demo; fixed heights make the range O(1) |
| Not windowed: every row in normal flow in the same scroll box | The honest naive version; same scroll height |
| Memoized rows on: `memo(Row)` with props `instrument` (object identity changes only when updated), `selected` (boolean), `onSelect` (stable `useCallback`); off: plain `Row` and an inline callback per row | `memo` only works with stable props; the toggle teaches both halves |
| The board component itself is always `memo`, and every prop it gets is stable (`useCallback` for `onSelect`, `onSort`, `onClearFilter`); the "updating…" dimming is on a wrapper, not a board prop | Deferred filtering only pays off when the urgent render can skip the board. Verification found both mistakes: a new `onSort`/`onClearFilter` per render and a `stale` prop made every keystroke re-render all rows synchronously (168 ms `input` event at 20,000 rows) |
| Cached derive on: `useMemo([data, query, sort])`; off: `derive(...)` each render | Hooks can't be conditional: the memo runs always but returns null when off |
| Deferred on: board gets `useDeferredValue(query)`; "Updating…" while `deferred !== query` | Standard React pattern |
| Indexed updates: on → `Map<id, position>` built once per dataset; off → `rows.findIndex` per update | O(k) vs O(n·k) per feed update, measured as "apply update" time |
| Updates are always immutable (new array, new objects for changed rows) | Same data in every combination (AC-012); `memo` needs identity changes |
| Feed: `setInterval` in an effect, seeded PRNG (mulberry32) created when the feed (re)starts; paused while the tab is hidden, during safety pause, or by the user | Repeatable benchmark; WCAG 2.2.2 pause control |
| Safety: `renderTimer` reports renders > 1 s to a listener; the demo pauses the feed with a notice (not during a benchmark, which stops on its own and must stay comparable); windowing off above 20,000 rows (or a 50,000 dataset with windowing off) asks via `confirm()` | AC-021, AC-022 |
| Dataset cache: module-level `Map<size, Promise<Instrument[]>>` | Load once per size (AC-023), survives navigation |
| Benchmark: an async script calling an `api` object built from the demo's handlers (type, clear, sort, select, scroll, feed) with an `AbortSignal`; metrics store records samples between `startRecording()` and `stopRecording()`; results kept in a module store (last 6) | Same code paths as the user; survives navigating away and back |
| Long tasks: `PerformanceObserver` (`longtask`), feature-detected; TBT = Σ(duration − 50 ms) over 10 s | Chromium-only metric, labelled when unsupported |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Schema | src/server/practices/large-dataset/instruments.schema.ts | new | Instrument type, sectors, sizes, query schema |
| Data | src/server/practices/large-dataset/instruments.data.ts | new | `server-only` deterministic generator, cached per size |
| Route | src/app/api/practices/large-dataset/instruments/route.ts | new | GET dataset |
| Feed | src/practices/large-dataset/feed.ts | new | PRNG, `nextUpdate(rows, batch, rng, now)`, `applyUpdate(rows, updates, index?)`, `buildIndex` |
| Derive | src/practices/large-dataset/derive.ts | new | `derive(rows, query, sort)`; sort comparators; `SortKey` |
| Metrics | src/practices/large-dataset/metrics.ts | new | Module store: render timer, row counter, derive/update timings, input delay, fps loop, long tasks, recording, slow-render listener, `useMetrics` |
| Dataset | src/practices/large-dataset/dataset.ts | new | Fetch + module cache per size |
| Benchmark | src/practices/large-dataset/benchmark.ts | new | Scenario script, result summary, results store |
| Board | src/practices/large-dataset/board.tsx | new | Header (sort buttons), windowed / full body, rows (memo or plain), empty state |
| Optimization panel | src/practices/large-dataset/optimization-panel.tsx | new | Presets (`ALL_ON`/`ALL_OFF`), five switches with one-line effects, `heavyWarning` confirmation |
| Metrics panel | src/practices/large-dataset/metrics-panel.tsx | new | Live numbers, reset |
| Details panel | src/practices/large-dataset/details-panel.tsx | new | Selected instrument, live |
| Benchmark panel | src/practices/large-dataset/benchmark-panel.tsx | new | Run/Stop, progress, step, results table |
| Demo | src/practices/large-dataset/demo.tsx | new | State, feed, safety, wiring |
| Format | src/practices/large-dataset/format.ts | new | Price, percent, volume, time formatters |
| Explanation | src/practices/large-dataset/explanation.tsx | new | Guide |
| Page | src/app/(playground)/react-practices/large-dataset-performance/page.tsx | new | Frame |
| Catalog | src/practices/catalog.ts | modify | `built: true` |

## Visual Design Considerations

From `ui-ux-pro-max` (real-time dashboard rules: pause/resume control,
direction not by colour alone, reduced motion), mapped to neutral tokens:

- Controls panel: Dataset, Updates per second, Rows per update, Pause/Resume.
- Stage top: optimization panel: two preset buttons (`aria-pressed` when the
  combination matches), five checkboxes as cards in a
  `sm:grid-cols-2 lg:grid-cols-5` grid, each with a title and a one-line
  effect; a "Custom" label when mixed.
- Measurements: a full-width row of tiles (`grid-cols-2 sm:grid-cols-3
  lg:grid-cols-5`, label + mono value, "slow" text and border when over
  budget) above the board, so they stay in view while interacting. (A side
  column next to the board was tried first and clipped the board's columns.)
- Board: full width; filter input + "N of M instruments" + "updating…" cue,
  then the board (`h-[30rem]`, `relative isolate overflow-auto`, sticky
  header `bg-muted`, CSS grid columns with min width 48rem so it scrolls
  inside its box on phones); selected-instrument details below it.
- Warning text uses `color-mix(var(--warning), black 40%)` in light mode
  (plain `text-warning` failed contrast).
- Change column: ▲/▼ icon + signed percent text, `text-success` /
  `text-destructive`; no flashing animation.
- Notices: safety pause as a warning line with Resume.
- Benchmark section below: Run / Stop, `Progress` bar + step text
  (`aria-live` polite), results table (small, `overflow-x-auto` inside a
  relative box), "best" text badge in the best cell of each column.

## Data Flow

```mermaid
sequenceDiagram
  participant D as Demo (React state)
  participant F as Feed timer
  participant B as Board (memo)
  participant M as Metrics store
  participant P as Metrics panel
  D->>D: load dataset (cached per size)
  F->>D: setRows(applyUpdate(rows, updates, index?)) + M.recordUpdate(ms)
  D->>M: renderTimer.start(); derive (cached?) + M.recordDerive(ms)
  D->>B: rows, selection, flags (deferred query?)
  B->>M: rowRendered() per row
  B->>M: layout effect: renderTimer.end() → duration, rows re-rendered
  M-->>D: slow render (> 1 s) → pause feed
  P->>M: read snapshot every 250 ms (no board render)
```

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | Data, route, dataset, board | instruments.data.ts, route.ts, dataset.ts, board.tsx | Done |
| AC-002 | Feed, demo, board change cell | feed.ts, demo.tsx, board.tsx | Done |
| AC-003, AC-004 | Derive, board header | derive.ts, board.tsx | Done |
| AC-005 | Selection, details | demo.tsx, details-panel.tsx | Done |
| AC-006–AC-012 | Flags in demo/board/feed | demo.tsx, board.tsx, feed.ts, optimization-panel.tsx | Done |
| AC-013–AC-017 | Metrics store + panel | metrics.ts, metrics-panel.tsx | Done |
| AC-018–AC-020 | Benchmark | benchmark.ts, benchmark-panel.tsx, demo.tsx | Done |
| AC-021, AC-022 | Safety | optimization-panel.tsx, metrics.ts, demo.tsx | Done |
| AC-023 | Dataset size | dataset.ts, demo.tsx | Done |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | None configured; Node scripts (`--experimental-strip-types`) over pure modules; Puppeteer (script with real input, and MCP) against `pnpm build && pnpm start` |
| Command | `pnpm typecheck && pnpm lint && pnpm build` + scratchpad scripts |
| Location | Scratchpad (not committed), as in features 008–014 |

### Reference Tests

| File | What It Tests |
|------|---------------|
| .artifacts/features/014-data-grid/audit.md | Scripted + browser evidence format |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| Feed / derive | scratchpad/t-feed.ts | indexed vs scan give identical arrays; derive stable; filter folding |
| Equivalence | Puppeteer | 50 random flag combinations: same visible rows/values for a frozen dataset + filter + sort |
| Benchmark | Puppeteer | Naive vs Optimized at 20k (≥ 10× median), Optimized at 50k (input < 100 ms, fps > 50) |
| Memo rows | Puppeteer | rows re-rendered per feed update ≤ visible rows (on) vs all (off) |
| A11y / layout | Puppeteer + axe | both themes, 360 px |

## Considerations

### Error Handling

- Dataset load failure: error with Retry (clears the cached promise).
- Benchmark Stop or leaving the page aborts the script; partial runs add no result.

### Security

- Read-only mock API; `size` validated by zod.

## Open Questions

- None.

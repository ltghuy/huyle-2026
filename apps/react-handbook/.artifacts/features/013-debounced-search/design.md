---
id: "013"
feature: debounced-search
created: 2026-10-07
---

# Technical Design: Debounced Search + API Cache

## Scope

**In scope:** mock product search API (deterministic catalog, shared query
normalization, variable latency with two modes, abort-aware delay, failure
injection), a framework-free search engine (debounce, minimum length,
in-flight dedupe, `AbortController`, run-id stale guard, timeline + counters,
switchable techniques), a module-level LRU + TTL cache with
stale-while-revalidate, a typing robot, an APG combobox with inline listbox,
result highlighting, loading / empty / error / mismatch states, URL sync,
timeline, cache inspector, technique switches and presets, demo controls,
explanation guide, route and catalog entry.

**Out of scope:** fuzzy search, persistence, recent searches, paging,
automated test files (none in the repo; logic is checked with a scratchpad
script, UI with Puppeteer).

## Research Summary

> Sources: React docs (`useSyncExternalStore`, `useEffect` cleanup and Strict Mode, "You might not need an effect"), MDN (`AbortController`, `AbortSignal`, `fetch` abort errors, `History.replaceState`, `String.prototype.normalize`), WAI-ARIA APG Combobox pattern (list autocomplete, `aria-activedescendant`), bundled Next 16 docs (`linking-and-navigating.md`: native `history.replaceState` integrates with the router; page `searchParams` is a Promise), vercel-react-best-practices, ui-ux-pro-max, `.agents/knowledge.md`.

- **Debounce:** trailing-edge timer reset on every change; the work runs once input has been quiet for the delay. Throttle (at most once per interval) suits continuous signals (scroll), not "the user finished typing".
- **Out-of-order responses:** each request's latency is independent; nothing guarantees the last request finishes last. `fetch` resolves in completion order.
- **Abort:** `controller.abort()` rejects the pending `fetch` (and a pending `res.json()`) with an `AbortError` `DOMException`; check `signal.aborted` rather than the error name. Route handlers receive `request.signal`, which aborts when the client disconnects, so the mock delay can stop early.
- **Guard:** abort is best effort (a response already resolved, or a non-abortable source); a monotonically increasing run id compared at apply time is the guarantee.
- **SWR:** show cached data immediately, refetch in the background when stale, swap when the response arrives; `Map` iteration order gives LRU cheaply (delete + set on read).
- **Combobox (APG, list autocomplete without automatic selection):** input `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls` → `role="listbox"`; options `role="option"` with `aria-selected` on the highlighted one; DOM focus stays on the input and `aria-activedescendant` names the highlighted option; Down/Up move, Enter accepts, Escape closes then clears.
- **Next 16:** `window.history.replaceState(null, "", url)` is supported and syncs `useSearchParams`; the page's `searchParams` prop is a Promise (awaiting it makes the route dynamic).
- **vercel-react-best-practices:** `useSyncExternalStore` for the engine and cache subscriptions (`client-*`, `rerender-*`), lazy `useState` init for the engine (`rerender-lazy-state-init`), interaction logic in event handlers not effects (`rerender-move-effect-to-event`), effects only to sync with external systems (URL, timers), `memo` for timeline rows, hoisted static options (`rendering-hoist-jsx`), `Map` lookups (`js-set-map-lookups`), hoisted RegExps (`js-hoist-regexp`), ternaries for conditional rendering.
- **ui-ux-pro-max:** autocomplete = debounced fetch + list; no-results state with suggestions; loading feedback (spinner / skeleton), keep focus rings, 44 px-ish targets on touch, reduced motion, no horizontal scroll at 360 px, semantic tokens only. Generated dark-only palette and fonts rejected (see decisions).

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| API routes | Thin route → Zod → `server-only` service; `{ error: { message, issues? } }`, 422 | Logic in routes | src/app/api/practices/searchable-accordion/faq/route.ts:1 |
| Shared schema | `src/server/practices/{slug}/*.schema.ts` without `server-only` | Duplicated constants | src/server/practices/searchable-accordion/faq.schema.ts |
| Network settings | Module-level `network` object read at request time | Prop drilling | src/practices/context-reducer/shop-api.ts:10 |
| Client stores | Class/module store + `useSyncExternalStore`, mutate from events/effects | Context `{state, dispatch}` | .agents/knowledge.md Codebase Feedback (feature 002) |
| Demo / guide / registration | `DemoControls` + `DemoStage`, guide blocks, own route + `built: true` | — | src/practices/context-reducer/demo.tsx, explanation.tsx |
| Native form controls in controls | `select` / `input[type=range|checkbox]` with visible labels | Unlabelled controls | src/practices/data-fetching-hook/demo.tsx:110 |
| Event handlers | Named `handleX` for multi-line logic (rule 05) | Multi-line inline arrows | .claude/rules/05-event-handlers.md |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `foldText`, `mergeRanges`, `Range` | src/practices/searchable-accordion/search.ts | Accent-insensitive highlight ranges mapped to the original name (read-only import) |
| `Highlight` | src/practices/searchable-accordion/highlight.tsx | Renders `<mark>` ranges as text nodes |
| `jsonError` | src/lib/http.ts | Route errors |
| `toast` | src/practices/toast-notifications/toast-store.ts | "Cache cleared" confirmation |
| Button, Input, Skeleton | src/components/ui/* | UI |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| Product | Catalog item |
| SearchResult | One response: query, items, total, server time |
| CacheEntry | Cached result with timestamps and hits |
| TimelineEntry | One search event |
| Counters | Totals per event kind |
| SearchSnapshot | Everything the UI renders from the engine |
| Techniques / EngineOptions | Switches and timings |

#### Product (`src/server/practices/debounced-search/search.schema.ts`)

- `id` (string `p0001`…), `name` (string), `category` (string), `price` (cents, int)

#### SearchResult

- `query` (normalized string), `items` (Product[], ≤ 20), `total` (int), `latencyMs` (int, the server's simulated delay)

#### CacheEntry (`src/practices/debounced-search/search-cache.ts`)

- `key` (string), `result` (SearchResult), `storedAt` (ms), `hits` (int); derived `state`: "fresh" (age < freshMs) | "stale" (age < maxAgeMs) | expired (removed)

#### TimelineEntry (`src/practices/debounced-search/search-engine.ts`)

- `id` (int), `kind` ("debounced" | "cache" | "request"), `query` (string), `revalidate` (bool, background refresh), `outcome` ("waiting-cancelled" | "cache-hit" | "pending" | "shown" | "aborted" | "stale" | "error" | "error-dropped"), `startedAt` / `endedAt` (ms, `performance.now()` base), `resultCount?`, `message?`

#### SearchSnapshot

- `input` (raw text), `key` (normalized), `tooShort` (bool), `waiting` ({ key, startedAt, delayMs } | null), `loading` (bool: a request for the current run is in flight), `inflight` (int: any requests in flight), `shown` ({ key, result, source: "network" | "cache", storedAt, refreshing } | null), `error` ({ key, message } | null), `runKey` (string | null), `runText` (string: trimmed raw text of the latest run, for the URL), `timeline` (TimelineEntry[], newest first, ≤ 50), `counters` (keystrokes, debounced, requests, cacheHits, aborted, stale, errors), `options` (EngineOptions)

#### EngineOptions

- `debounce`, `cache`, `abort`, `staleGuard` (bool, all true by default), `debounceMs` (300), `minLength` (2)

### Relationships

A run (search start) has an id; requests carry the run id they were started (or adopted) for. Cache entries are keyed by the normalized query, the same key the engine and the server use.

### API Contracts

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| /api/practices/debounced-search/search | GET `?q&latencyMs&jitterMs&mode=random\|shorter-slower&failRate` | — | 200 `{ data: SearchResult }` · 500 `{ error: { message } }` (injected) · 422 (bad params) |

`q` is normalized on the server with the shared `normalizeQuery`; latency = `latencyMs + random(0, jitterMs)` (+ `150 × max(0, 8 − q.length)` in `shorter-slower`); the delay stops early when `request.signal` aborts.

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-005 | name, category, price, total | none | no | must add (search.service.ts) |
| AC-012 | query, result count, age, state, hits | none | no | must add (search-cache.ts) |
| AC-014 | kind, outcome, query, start, duration | none | no | must add (search-engine.ts) |
| AC-015 | keystrokes, debounced, requests, cacheHits, aborted, stale, errors | none | no | must add (search-engine.ts) |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Framework-free `SearchEngine` class (subscribe / getSnapshot, immutable snapshots) owns debounce, runs, requests, timeline; React only renders and forwards events | The pattern is testable in Node with a fake fetcher and identical for the robot and real typing |
| Engine per mounted demo (lazy `useState`), cache at module level (`searchCache`) | Box state resets with the page (URL is the source on load); cache survives navigation (AC-013) |
| `setInput` ignores changes that keep the same normalized key (relative to the last handled key) | AC-004: trailing space / case changes cost nothing |
| A key with a *fresh* cache entry runs on the keystroke (no debounce); stale entries still wait (`SearchCache.peek`) | Found in verification: a cache hit waited 300 ms for nothing (see decisions.md) |
| Run id increments on every search start, including cache hits and too-short clears; a response applies only if its request's run id is current (when the guard is on) | One rule covers all ways a search can be superseded |
| A run for a key that already has an in-flight, non-aborted request adopts it (re-tags its run id) instead of sending a duplicate | Edge case: no duplicate requests; works with abort off (typing back to a pending query) |
| Superseded requests are aborted when a new run starts (abort on); the timeline entry is closed as "aborted" at abort time, later settlement ignored | Accurate timeline without waiting for the rejection |
| Successful responses are written to the cache before the guard check (cache on) | Dropped responses still fill the cache (AC-007) |
| A failed background refresh keeps the stale results visible and shows the error with Retry | Data the user already had isn't taken away |
| Retry = `run(key, { force: true })`: skips the cache and debounce | AC-021 |
| Mismatch = `!waiting && inflight === 0 && !tooShort && shown && shown.key !== key` | AC-017: only reported when settled, so normal loading never warns |
| Typing robot calls `engine.setInput(prefix)` on a timer; any real `onChange` stops it | Same code path as typing (AC-019) |
| Combobox: highlighted index stored with the result object it belongs to; a new result object resets it (derived, no effect) | No stale highlight after results change |
| Listbox inline, `aria-expanded` = open and has options; Escape hides until next input | Decisions: inline presentation |
| Status region text derived from the snapshot only when settled | AC-024: no per-keystroke announcements |
| URL: effect on `runText` + `tooShort` → `history.replaceState(null, "", url)`; page awaits `searchParams.q` and passes it as `initialQuery`; engine `start()` runs it immediately | AC-025; Strict Mode safe because `stop()` aborts and `start()` re-runs |
| Timeline axis spans entries started in the last 4 s of activity, to the latest end (or now while requests are pending, ticking every 100 ms only then); older rows have no bar | Bars stay comparable; found in verification that an all-rows axis squeezed bars; no timer when idle |
| Cache inspector ticks every 1 s for ages | Ages and fresh → stale transitions are visible |
| Technique switches and robot live in the stage ("Techniques" card); server, timing and cache settings in `DemoControls` | Switches are the lesson and sit next to the box; settings are setup |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Schema | src/server/practices/debounced-search/search.schema.ts | new | `normalizeQuery`, limits, `searchParamsSchema`, `Product`, `SearchResult`, `LatencyMode` |
| Catalog data | src/server/practices/debounced-search/search.data.ts | new | `server-only`; lazily built 5,616 products with folded word index |
| Service | src/server/practices/debounced-search/search.service.ts | new | `server-only`; `searchProducts`, `simulatedLatency`, abort-aware `delay` |
| Route | src/app/api/practices/debounced-search/search/route.ts | new | Thin adapter, failure injection |
| Search API | src/practices/debounced-search/search-api.ts | new | `network` settings, `fetchSearch(query, signal)` |
| Cache | src/practices/debounced-search/search-cache.ts | new | `SearchCache` (LRU + TTL + SWR states, `peek`, hits, subscribe), `searchCache` instance |
| Engine | src/practices/debounced-search/search-engine.ts | new | `SearchEngine`: setInput, submit, retry, setOptions, clearTimeline, start/stop, snapshot, mismatch helper |
| Robot | src/practices/debounced-search/typing-robot.ts | new | `typePhrase(phrase, msPerChar, onType, onDone)` → stop |
| Hooks | src/practices/debounced-search/use-search.ts | new | `useSearchEngine`, `useCacheEntries`, `useNow`, URL sync |
| Highlight | src/practices/debounced-search/highlight-text.tsx | new | Word-prefix ranges via `foldText`, renders `Highlight` |
| Search box | src/practices/debounced-search/search-box.tsx | new | Combobox input, waiting bar, status line, listbox, idle/empty/error/mismatch, live region |
| Timeline | src/practices/debounced-search/request-timeline.tsx | new | Counters + rows with bars, Clear |
| Cache inspector | src/practices/debounced-search/cache-inspector.tsx | new | Entry table, Clear cache |
| Techniques | src/practices/debounced-search/technique-panel.tsx | new | Four switches, presets, robot controls |
| Demo / guide | src/practices/debounced-search/{demo,explanation}.tsx | new | Controls + layout; guide |
| Page + catalog | src/app/(playground)/practices/debounced-search/page.tsx, src/practices/catalog.ts | new / modify | Route (awaits `searchParams`); `built: true` |

### Visual direction (ui-ux-pro-max)

- Stage, top to bottom: **Techniques** card (four labelled switches with a one-line "what breaks without it", presets, robot phrase + speed + Type/Stop) → **search** (`lg:grid-cols-[minmax(0,1fr)_18rem]`: combobox + results on the left; selected product card on the right, below on small screens) → **Timeline** (counters as a compact `dl` row, then rows) → **Cache** inspector.
- Search input: visible label "Search products", search icon, spinner at the end while loading, clear button; under it a 2 px "waiting" bar that shrinks over the debounce delay (CSS animation keyed by `startedAt`, static text "Waiting…" under reduced motion) and a status line ("20 of 134 results for “lamp”" + badges "Cached 12 s ago", "Refreshing…", "Updating…").
- Listbox: up to 20 rows (name with `<mark>` highlights, category, price in tabular numerals), max height ~22 rem with scrolling (`relative` scroller per knowledge gotcha), highlighted option `bg-accent` + left bar, hover = highlight.
- States: idle hint + example query chips; skeleton rows on first load; dimmed list (`opacity-60`) while updating; empty state with suggestions; error alert (destructive text token on a tint) with Retry; mismatch warning (warning icon, foreground text on `bg-warning/15`, never colour alone).
- Timeline rows: icon + outcome text + mono query + "+120 ms · 340 ms"; bar track behind using tokens: shown = `bg-success`, cache = `bg-primary`, stale = `bg-warning`, aborted = `bg-muted-foreground/60`, errors = `bg-destructive`, debounced = dashed border; legend through text. Rows `min-w-0` + `truncate` for long queries (knowledge gotcha: grid min-width).
- 360 px: everything stacks; the cache table scrolls inside a `relative overflow-x-auto` wrapper.

## Data Flow

```mermaid
sequenceDiagram
  participant U as Input / robot
  participant E as SearchEngine
  participant C as searchCache
  participant F as fetchSearch
  participant S as Mock API
  U->>E: setInput(text)
  E->>E: normalize; same key? stop. too short? supersede + clear
  E->>E: debounce on: (re)start timer, record debounced
  E->>E: timer fires → run(key): runId++
  E->>C: get(key) (cache on)
  alt fresh
    C-->>E: result → shown (cache hit), abort others
  else stale
    C-->>E: result → shown (refreshing) + background request
  else miss
    E->>F: request(key, signal) (abort older if abort on)
  end
  F->>S: GET ?q&latency…
  S-->>F: SearchResult (after variable delay)
  F-->>E: result
  E->>C: set(key, result)
  E->>E: guard: runId current? show : drop as stale
  E-->>U: snapshot → React (useSyncExternalStore)
```

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | Debounce timer, waiting bar | search-engine.ts, search-box.tsx | Done |
| AC-002 | `submit()` on Enter | search-engine.ts, search-box.tsx | Done |
| AC-003 | Min length supersede + hint | search-engine.ts, search-box.tsx | Done |
| AC-004 | `normalizeQuery`, same-key skip, maxLength | search.schema.ts, search-engine.ts | Done |
| AC-005 | Server search + list + highlight | search.service.ts, search-box.tsx, highlight-text.tsx | Done |
| AC-006 | Abort superseded | search-engine.ts | Done |
| AC-007 | Run-id guard, cache before guard | search-engine.ts | Done |
| AC-008 | Dimmed / skeleton | search-box.tsx | Done |
| AC-009–011 | Cache states, LRU, TTL, no errors cached | search-cache.ts, search-engine.ts | Done |
| AC-012 | Inspector | cache-inspector.tsx | Done |
| AC-013 | Module-level cache | search-cache.ts | Done |
| AC-014 | Timeline rows + bars | search-engine.ts, request-timeline.tsx | Done |
| AC-015 | Counters | search-engine.ts, request-timeline.tsx | Done |
| AC-016 | Technique switches | search-engine.ts, technique-panel.tsx | Done |
| AC-017 | Mismatch warning | search-engine.ts, search-box.tsx | Done |
| AC-018 | Presets | technique-panel.tsx | Done |
| AC-019 | Typing robot | typing-robot.ts, technique-panel.tsx, demo.tsx | Done |
| AC-020 | Server controls | demo.tsx, search-api.ts, search.service.ts | Done |
| AC-021 | Error + Retry, dropped errors | search-engine.ts, search-box.tsx | Done |
| AC-022 | Empty state | search-box.tsx | Done |
| AC-023 | Combobox keyboard + pick | search-box.tsx, demo.tsx | Done |
| AC-024 | Live status | search-box.tsx | Done |
| AC-025 | URL sync | use-search.ts, page.tsx | Done |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | None in repo; gate `pnpm typecheck && pnpm lint && pnpm build` |
| Logic checks | Scratchpad script via `jiti`: engine with a fake fetcher (controllable delays), cache LRU/TTL with an injected clock, normalization |
| UI checks | Puppeteer MCP on the dev server (port 3113): robot runs per technique setting, request counts (Performance API `resource` entries), combobox keyboard via dispatched `keydown` on the input (handled with `preventDefault`), URL, axe both themes, 360 px |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| Engine + cache | scratchpad script (not committed) | debounce count, same-key skip, min length, dedupe, abort, guard over 200 random sequences, cache hit / SWR / LRU / expiry / errors not cached, mismatch with guard off |
| UI | Puppeteer scripts | SC1–SC6, AC walk-through |

## Considerations

### Error Handling

- Non-2xx → `Error(json.error.message)`; network failure → "Can't reach the server. Check your connection and retry."; aborted → recorded as aborted, never surfaced.
- Bad query params → 422 (shouldn't happen from the UI; `q` is cut client-side).

### Security

- `q` is matched literally against a precomputed word index (no RegExp from input); results render as text nodes (`Highlight`), never HTML.
- Params bounded by Zod (latency ≤ 5000, failRate 0–1, `q` ≤ 200 before normalization).

## Open Questions

- None.

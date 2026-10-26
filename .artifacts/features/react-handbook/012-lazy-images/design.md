---
id: "012"
feature: lazy-images
created: 2026-10-07
---

# Technical Design: Lazy-Loaded Images

## Scope

**In scope:** mock photo API (photo list, seeded SVG images at four widths
with latency/jitter/failure injection, per-run settings and server-side
request stats with cancellation detection), a framework-free lazy loader
(IntersectionObserver on the gallery scroller with a margin, start delay,
cancel on leave, priority start, decode before reveal, retry, fallback
without IntersectionObserver), per-run metrics (shown/failed/skipped,
time to visible, layout shift, polled server stats), the gallery with
three strategies sharing placeholders and space reservation, a results
table, demo controls, explanation guide, route and catalog entry.

**Out of scope:** image format conversion, lightbox, virtualization,
iframes/video, bandwidth throttling, automated tests (none in the repo).

## Research Summary

> Sources: MDN (IntersectionObserver `root`/`rootMargin`/`scrollMargin`, `HTMLImageElement.decode()`, `srcset`/`sizes`, `fetchpriority`, `loading="lazy"`, LayoutShift API, PerformanceResourceTiming), HTML spec ("list of available images"), web.dev (lazy loading, CLS, LCP and lazy loading), vercel-react-best-practices, ui-ux-pro-max.

- **Margin only grows the root:** `rootMargin` expands the observer's root rectangle. With the implicit root (viewport), an image inside a scrolling box is still clipped by the box, so the margin never reaches below the box's fold; to preload inside a scroller the scroller must be the `root` (or `scrollMargin`, newer and less supported).
- **Native lazy loading** picks its own distance (Chrome: about 1250–2500 px depending on connection), can't be cancelled, and starts after layout; good default, no control.
- **Lazy-loading the first visible image delays the largest paint;** above-the-fold images should load eagerly with `fetchpriority="high"`.
- **`decode()`** resolves once the image can be painted without a decode stall, rejecting for undecodable data; revealing after it avoids partially painted images.
- **`srcset` with `w` descriptors + `sizes`:** the browser picks a candidate for slot width × device pixel ratio. A JS loader knows the tile's measured width, so it can set `sizes` to that exact width (native now has `sizes="auto"` for lazy images in Chromium only).
- **Cancelling an image fetch:** clearing `srcset`/`src` of an image whose load is pending stops the fetch; the server sees the connection close (route handler `request.signal` aborts). To verify, not assume: the server counts cancellations.
- **Re-showing a loaded URL:** a second `<img>` with the same URL in the same document uses the "list of available images" (and the HTTP cache with `max-age`), so the reveal makes no second request. Verified by the server's request count.
- **Layout shift:** `PerformanceObserver({ type: "layout-shift" })` entries have `value`, `hadRecentInput` and `sources[].node`; Chromium only.
- **vercel-react-best-practices:** `memo` tiles (`rerender-memo`), per-tile subscriptions via `useSyncExternalStore` so one image's state change re-renders one tile (`rerender-derived-state`), transient values in refs (`rerender-use-ref-transient-values`), handlers in events not effects (`rerender-move-effect-to-event`), static JSX/consts hoisted (`rendering-hoist-jsx`), passive scroll listeners not needed (observer instead), `Map` lookups (`js-index-maps`), ternaries for conditional render.
- **ui-ux-pro-max:** reserve space with `aspect-ratio` (CLS < 0.1), descriptive alt text, srcset for sizes, skeleton/blur placeholders, 150–300 ms fade, reduced motion respected, focus rings, 44 px targets on touch, mobile-first grid (2 → 3 columns), no horizontal scroll. Its suggested dark-only developer palette was not adopted; the page maps to the existing shadcn tokens (see decisions.md).

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| API routes | Thin route → Zod → service; `{ error: { message, issues? } }`, 422 on bad query | Logic in routes | src/app/api/practices/infinite-scroll/feed/route.ts:7, src/lib/http.ts:5 |
| Dynamic route params | `RouteContext<"/api/...">`, `await ctx.params` | Sync params (pre-15) | src/app/api/practices/file-upload/uploads/[id]/route.ts:9 |
| Shared schemas | `src/server/practices/{slug}/*.schema.ts`, no `server-only` | Duplicated types | src/server/practices/infinite-scroll/feed.schema.ts:1 |
| Long-lived mock state | `globalThis` holder | Module state duplicated by HMR | .agents/knowledge.md (feature 006 decision) |
| No I/O at import | Lazy init on first request | Side effects at module load | .agents/knowledge.md (feature 007 gotcha) |
| Client data | Shared `useQuery` for the photo list | Ad-hoc fetch in effects | src/practices/data-fetching-hook/use-query.ts:23 |
| Network settings | Module-level `network` object read at request time | Prop drilling | src/practices/context-reducer/shop-api.ts:10 |
| Framework-free engine + `useSyncExternalStore` | Class with `subscribe`/`getSnapshot` | State machines inside components | .agents/knowledge.md (feature 008, 002 conventions) |
| Demo layout | `DemoControls` + `DemoStage`, guide blocks, own route + `built: true` | — | src/components/playground/demo-controls.tsx:5, demo-stage.tsx:31 |
| Range/select controls | Local `Range`/`Select` helpers with labels | Placeholder-only labels | src/practices/infinite-scroll/demo.tsx:79 |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `useQuery`, `HttpError` | src/practices/data-fetching-hook/use-query.ts:23, query-client.ts:43 | Photo list loading + Retry |
| `jsonError`, `parseBody` | src/lib/http.ts:5, :12 | Routes |
| `toast` | src/practices/toast-notifications/toast-store.ts:317 | "Retry failed" summary, stats errors |
| `DemoControls`, `DemoStage` | src/components/playground/ | Page frame |
| Guide blocks | src/components/playground/practice-guide.tsx:8–77 | Explanation |
| Button, Skeleton | src/components/ui/button.tsx, skeleton.tsx | Controls, list skeleton |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| Photo | One gallery item from the photo list |
| RunSettings | Latency and failure rate the server applies to one run's images |
| RunStats | What the server saw for one run |
| TileState | Hand-built loader state of one tile |
| RunMetrics snapshot | Client-side live numbers of the current run |
| ResultRow | Final numbers of the latest run per strategy |

#### Photo (`src/server/practices/lazy-images/photos.schema.ts`, new)

- `id` (string `ph-01`…`ph-96`), `title` (string), `alt` (string, describes the scene), `width`, `height` (int, intrinsic ratio: 4:3, 3:2, 1:1, 3:4, 16:9 at 1280 wide), `color` (CSS hex, dominant sky color), `preview` (data-URI SVG, < 600 bytes)

#### RunSettings / RunStats (same file)

- RunSettings: `latencyMs` (0–10000), `failRate` (0–1)
- RunStats: `requests` (int), `served` (int), `failed` (int), `cancelled` (int), `bytes` (int, uncompressed body), `inFlight` (int)

#### TileState (`src/practices/lazy-images/lazy-loader.ts`, new)

- `status`: `"idle" | "waiting" | "loading" | "shown" | "error"` (waiting = inside the band, start delay running)
- `src` (string | null: chosen candidate once shown), `width` (number | null: candidate width), `attempt` (int)

#### RunMetrics snapshot (`src/practices/lazy-images/run-metrics.ts`, new)

- `shown`, `failed`, `skipped`, `total` (ints), `visibleReadyMs` (number | null), `visibleCount` (int), `layoutShift` (number | null when unsupported), `server` (RunStats | null), `serverStale` (boolean), `fallback` (boolean: no IntersectionObserver)

### Relationships

A run has one strategy and one settings set; tiles key by photo id; every image request carries the run id, so server stats and client metrics join on it.

### API Contracts

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| /api/practices/lazy-images/photos | GET `?count=24\|48\|96&latencyMs` | — | `{ data: Photo[] }` · 422 |
| /api/practices/lazy-images/images/[id] | GET `?w=320\|640\|960\|1280&run&a` | — | 200 `image/svg+xml` (`Cache-Control: private, max-age=3600`) · 500 simulated · 404 unknown id/run · 422 |
| /api/practices/lazy-images/runs | POST | `{ run, latencyMs, failRate }` | `{ data: RunStats }` (creates or updates settings) · 400/422 |
| /api/practices/lazy-images/runs | GET `?run` | — | `{ data: RunStats }` · 404 unknown run |
| /api/practices/lazy-images/runs/stream | GET `?run` | — | `text/event-stream`, one `data: RunStats` event whenever the stats change (checked every 250 ms) · 404 unknown run |

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-001 | title, alt, width, height, color, preview | none | no | must add (Photo) |
| AC-004 | candidate width, KB per tile | none | no | must add (currentSrc + resource timing) |
| AC-010 | requests, KB, cancelled, failed | none | no | must add (RunStats) |
| AC-010 | shown/total, visible ready, layout shift | none | no | must add (RunMetrics) |

## Decisions

| Decision | Rationale |
|----------|-----------|
| SVG generated per request from a seeded PRNG; detail (grain dots) scales with `w`; width label drawn in the corner | Real byte differences per candidate; visible `srcset` choice; deterministic |
| Run id in every image URL; settings held by the server per run (POST before the gallery mounts) | URLs stay stable when latency/failure change, so native/eager `<img>` don't re-request; settings apply to the next requests (AC-015) |
| Server stats per run on `globalThis` (cap 50 runs, oldest dropped); cancel = `request.signal` aborts during simulated latency | Same measurement for all strategies; proves cancellation reaches the server |
| Stats pushed over a server-sent event stream opened (and awaited) before the gallery mounts; one final `GET runs` when the run ends | Polling every second was tried first: over HTTP/1.1 the browser allows ~6 connections per host, so with six images in flight the poll queued behind them and the counters read 0 for the whole latency. A stream opened first keeps its connection |
| When a run ends, native/eager tiles clear `srcset` on their unfinished `<img>`s | Browsers keep downloading images removed from the DOM; the old run's eager requests held every connection and delayed the next run's first images by the full latency |
| Image responses `private, max-age=3600`; a new run or retry changes the URL | Reveal reuses the loaded response; fresh runs never hit the cache |
| Framework-free `LazyLoader` (one IntersectionObserver per run, root = scroller, `rootMargin: "{px}px 0px"`) with per-key subscriptions | Engine is testable and independent of React; one tile re-renders per state change |
| Loader preloads with an off-DOM `new Image()` (`sizes` = measured tile width, `srcset`, `fetchPriority`), awaits `decode()`, then the tile renders `<img src={currentSrc}>` with a CSS fade-in | Decode before reveal; exact `sizes`; cancel by clearing `srcset`/`src` |
| Start delay = one shared "scroll settled" timer: tiles entering the band while scrolling wait; every scroll event pushes the timer back; when it fires, all waiting tiles start. Leaving first → "skipped"; leaving while loading → cancel, back to idle. Tiles in range on their first observer record start at once | A per-tile dwell timer was tried first: at fly-through speed a tile stays in a ~1000 px band for ~300 ms, longer than the delay, so every tile was requested and then cancelled (48 requests, 36 cancelled). Waiting for scrolling to pause skips them (12 requests, 36 skipped). The initial-record exception keeps the start delay off the first visible tiles |
| Loader `attach(root)` after mount (tiles register earlier, in their own layout effects), `detach()` only disconnects the observer and timers; `destroy()` cancels in-flight loads and is called when the run ends | Children's effects run before the parent's; Strict Mode's simulated remount must not cancel and re-request priority images |
| Run object (id, strategy, settings, loader, metrics) created in event handlers, not render; the previous run is destroyed first | Old run's late events can't touch the new run (edge case 1) |
| Native/eager tiles: React `<img loading=…>` with the static `sizes`, reveal after `onLoad` → `decode()`; retry bumps `a` | Same placeholders, sizes and reservation as hand-built (AC-012) |
| Layout shift: PerformanceObserver entries with a source node inside the scroller, summed per run, started after the gallery's first layout | Scoped, measured; skeleton → tiles swap not counted |
| Time to visible: tiles intersecting the scroller at mount; done when all are shown; null with "—" if any fail | AC-010 |
| Failure announcements: one polite live region in the counters ("N images couldn't load") | Avoids one announcement per tile while scrolling (AC-019) |
| Fly through: rAF loop easing `scrollTop` from 0 to max over 2000 ms; reduced motion jumps to the end | `behavior: "smooth"` has no duration control |
| Results table in Demo state keyed by strategy; updated from the run's final snapshot (one last stats poll) on run end | AC-011 |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Photo schema | src/server/practices/lazy-images/photos.schema.ts | new | Zod queries/bodies, `WIDTHS`, `PHOTO_COUNTS`, types |
| Photo service | src/server/practices/lazy-images/photos.service.ts | new | Seeded photo list, SVG render, run settings + stats, `serveImage` with latency/abort/failure |
| Photos route | src/app/api/practices/lazy-images/photos/route.ts | new | GET list |
| Image route | src/app/api/practices/lazy-images/images/[id]/route.ts | new | GET SVG |
| Runs route | src/app/api/practices/lazy-images/runs/route.ts | new | POST settings, GET stats |
| Client API | src/practices/lazy-images/photos-api.ts | new | `network`, URLs/srcset, fetch list/stats/settings, `widthOf(url)`, `bytesOf(url)` |
| Lazy loader | src/practices/lazy-images/lazy-loader.ts | new | Engine described above |
| Run metrics | src/practices/lazy-images/run-metrics.ts | new | Counters, visible-ready, layout shift, stats polling |
| Run | src/practices/lazy-images/run.ts | new | Run type, settings, `createRun`/`endRun`, labels |
| Stats stream route | src/app/api/practices/lazy-images/runs/stream/route.ts | new | SSE of RunStats |
| Tiles | src/practices/lazy-images/photo-tile.tsx | new | `LazyTile`, `NativeTile`, shared frame, placeholder, error/Retry |
| Gallery | src/practices/lazy-images/gallery.tsx | new | Scroller, grid, attach loader/metrics, fly through |
| Counters | src/practices/lazy-images/run-counters.tsx | new | Live counter bar + live region |
| Results | src/practices/lazy-images/results-table.tsx | new | Per-strategy table |
| Demo | src/practices/lazy-images/demo.tsx | new | Controls, run lifecycle, stage |
| Explanation | src/practices/lazy-images/explanation.tsx | new | Guide |
| Route | src/app/(playground)/practices/lazy-images/page.tsx | new | PracticeFrame |
| Catalog | src/practices/catalog.ts | modify | `built: true` |

## Data Flow

```mermaid
sequenceDiagram
  participant D as Demo
  participant S as Server (runs/images)
  participant L as LazyLoader
  participant T as Tile
  D->>S: POST runs {run, latency, failRate}
  D->>S: open SSE runs/stream?run (await open)
  D->>D: mount Gallery (run)
  T->>L: observe(el, photo, priority)
  D->>L: attach(scroller) → IO observes; priority tiles start
  L-->>L: entry intersects band → start delay timer
  L->>S: new Image().srcset (run, w, a)
  S-->>S: record request, sleep(latency ± jitter, signal)
  S-->>L: SVG (or 500 / connection closed if cancelled)
  L-->>L: decode()
  L-->>T: state shown {src}
  T->>T: <img src> (memory cache), fade in
  S-->>D: SSE runs/stream (on change) → counters
```

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | Photos route, service, Gallery (list skeleton, error + Retry) | photos/route.ts, gallery.tsx | Planned |
| AC-002 | LazyLoader observer + margin, one request per run | lazy-loader.ts | Planned |
| AC-003 | LazyLoader decode, tile fade | lazy-loader.ts, photo-tile.tsx | Planned |
| AC-004 | srcset/sizes, width + KB caption | photos-api.ts, photo-tile.tsx | Planned |
| AC-005 | Priority start + fetchPriority | lazy-loader.ts, photo-tile.tsx | Planned |
| AC-006 | Placeholder kinds | photo-tile.tsx | Planned |
| AC-007 | Reserve space toggle | photo-tile.tsx | Planned |
| AC-008 | Layout-shift observer | run-metrics.ts | Planned |
| AC-009 | New run on strategy change | demo.tsx, run.ts | Planned |
| AC-010 | Counters, server stats | run-counters.tsx, run-metrics.ts, runs/route.ts | Planned |
| AC-011 | Results table | results-table.tsx, demo.tsx | Planned |
| AC-012 | NativeTile shares frame | photo-tile.tsx | Planned |
| AC-013 | Error tile + Retry | photo-tile.tsx | Planned |
| AC-014 | Retry with new `a`; Retry failed | lazy-loader.ts, photo-tile.tsx, demo.tsx | Planned |
| AC-015 | POST runs on latency/failure change | demo.tsx, photos.service.ts | Planned |
| AC-016 | Start delay + skipped | lazy-loader.ts | Planned |
| AC-017 | Cancel on leave + server cancelled | lazy-loader.ts, photos.service.ts | Planned |
| AC-018 | Fly through | gallery.tsx | Planned |
| AC-019 | alt, caption, aria-busy, live region | photo-tile.tsx, run-counters.tsx | Planned |
| AC-020 | Focusable scroller, focus rings | gallery.tsx | Planned |
| AC-021 | 2/3 columns, wrapping counters | gallery.tsx, run-counters.tsx | Planned |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | None in the repo; Node script checks (jiti) for the service, browser checks with Puppeteer |
| Command | `pnpm typecheck && pnpm lint && pnpm build`; ad-hoc scripts in the scratchpad |
| Location | Not committed |

### Reference Tests

| File | What It Tests |
|------|---------------|
| .artifacts/features/react-handbook/010-context-reducer/audit.md | Audit evidence style (scripted UI checks, axe in both themes) |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| Routes | scratchpad curl | list sizes, SVG per width (bytes grow), 422/404, failure rate 1 → 500, cancel counted |
| Gallery (browser) | Puppeteer evaluate | first-view requests per strategy, scroll with reserve on/off (layout shift), fly through skip counts, retry at 30 %, duplicate-free reveal, axe both themes, 360 px |

## Considerations

### Error Handling

- Photo list: `useQuery` error → inline alert with Retry (`refetch`).
- Image: 500/abort/decode error → tile error state; stats poll errors → last value + "stale".
- Unknown run on the image route (e.g. server restarted) → 404 → tile error; Reset starts a new run.

### Security

- All query/body input validated with Zod; run ids restricted to `[a-z0-9]{6,24}`; ids match `ph-NN` within the generated list; SVG built from numbers and fixed strings only (no user text in the SVG).
- Stats map capped (50 runs) so the mock can't grow without bound.

## Open Questions

- None.

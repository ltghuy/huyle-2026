---
id: "020"
feature: rendering-pipeline
created: 2026-10-09
---

# Technical Design: How the Browser Renders a Page

## Scope

In: a catalog entry and route for the page (`browser-platform/rendering`),
four topics with four client demos, one API area that serves a real sample
page and slow assets for the script-loading demo, and a link from the
Performance page's critical-path topic. Out: the event loop, resource hints,
new dependencies, any edit to `src/components/ui/`.

## Research Summary

From the platform specs and MDN (Knowledge Verification Chain step 4; items
marked *verify* are checked in the browser during implementation):

- `DOMParser.parseFromString(html, "text/html")` runs the full HTML parser (it inserts `html`/`head`/`body`, closes `<p>`, adds `tbody`) and never runs scripts. A sandboxed `srcdoc` iframe with `allow-same-origin` and **without** `allow-scripts` also parses and lays out the sample, runs no script, and lets the parent read `contentDocument` and `getComputedStyle`.
- Style rules that match: walk `document.styleSheets[i].cssRules`, keep `CSSStyleRule`s whose `selectorText` the element `matches()`. `getComputedStyle(el, "::before").content !== "none"` means a generated box exists in the render tree but not in the DOM.
- Render tree (simplified): elements with computed `display: none` and their subtrees are left out (head, script, style, meta default to `display: none`); `visibility: hidden` boxes take space but aren't painted; `display: contents` has no box but its children do; non-whitespace text nodes are included.
- Classic `<script src>` without attributes blocks the parser while it downloads and runs; any script waits for stylesheets earlier in the document before running; stylesheets in `<head>` block rendering. `defer` and `type="module"` scripts download in parallel and run in document order after parsing, before `DOMContentLoaded`; `async` scripts run as soon as they arrive (arrival order) and may run before or after `DOMContentLoaded`.
- `document.readyState` becomes `"interactive"` when the parser has finished the document (before deferred scripts and `DOMContentLoaded`), then `"complete"` at `load`.
- Resource Timing (`performance.getEntriesByType("resource")`) gives each asset's `startTime`/`responseEnd` relative to the document's time origin. Paint Timing (`getEntriesByType("paint")`) gives `first-paint`/`first-contentful-paint` per document, iframes included (*verify* in Chrome, Firefox, Safari; when missing, the timeline says "first paint not reported by this browser").
- Web Animations: `element.animate()` on `transform`/`opacity` is run by the compositor in Chromium, Gecko and WebKit, so it keeps moving while the main thread is busy; `left`, `width`, `background-color`, `box-shadow` animate on the main thread. Page scripts can't see compositor frames: `requestAnimationFrame` counts main-thread frames only, which stall for every property while the main thread is blocked.
- Reading a layout value (`offsetWidth`, `getBoundingClientRect`) after a style write forces a synchronous layout; there is no page API to count layouts, so the count comes from the pattern (one per read after a write vs one).

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Handbook page | catalog entry + route + `src/handbook/{slug}/content.tsx`, `Topic`/`Toc`, `linksLabel="Read more:"` | ad-hoc page layout | `src/handbook/origins/content.tsx:13-26`, `src/app/(playground)/browser-platform/origins-and-cors/page.tsx:1-13` |
| Catalog | `topicPages` entry with `section`, `slug`, `title`, `summary`, `written` | separate lists per section | `src/practices/catalog.ts:193-222` |
| API | thin route → `src/server/handbook/*.service.ts` (`import "server-only"`), Zod schema in `*.schema.ts`, `jsonError` 422 | logic in the route | `src/app/api/handbook/cache/route.ts:1-11`, `src/lib/http.ts:5-10` |
| Run ids | `z.string().regex(/^[a-z0-9-]{4,40}$/)` | unvalidated ids in output | `src/server/handbook/http-echo.schema.ts:26-29` |
| Shared demo UI | `Toggle`, `Verdict` | new checkbox cards | `src/handbook/ui.tsx:10-51` |
| `srcdoc` iframes | read `contentDocument` in `load`; check `nodeType`, not `instanceof` (other realm) | reading before load | `.agents/knowledge.md` Gotchas (feature 017) |
| Handlers | named `handleX` when more than one line | multi-line inline JSX handlers | `.claude/rules/react-handbook/05-event-handlers.md` |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `Topic`, `Toc` | `src/handbook/topic.tsx:9`, `src/handbook/toc.tsx` | import |
| `TopicFrame`, `topicMetadata`, `getTopicPage` | `src/components/playground/topic-frame.tsx`, `src/practices/catalog.ts:240-252` | page route |
| `Toggle`, `Verdict` | `src/handbook/ui.tsx` | settings and verdicts |
| `Button`, `Textarea`, `RadioGroup`, `Label` | `src/components/ui/` | controls |
| `jsonError` | `src/lib/http.ts:5` | 422 on bad params |
| Section index, sidebar, home progress | `sectionPages`/`sectionProgress` read `topicPages` (`src/practices/catalog.ts:236-260`) | no change: the new entry is picked up |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| TopicPageMeta entry | the new page in the catalog |
| LoadSetup | the learner's script-loading choices, sent as query params |
| LoadReport | what the sample page measured, posted back to the demo |
| RenderNode | one node of the DOM / render tree in the parsing demo (client only) |

#### TopicPageMeta (existing shape)

- `section` (`"browser-platform"`), `slug` (`"rendering"`), `title`, `summary`, `written` (`true`) -- `src/practices/catalog.ts:194-200`

#### LoadSetup (new, `render-lab.schema.ts`)

- `run` (string, `/^[a-z0-9-]{4,40}$/`)
- `css` (`"none" | "fast" | "slow"`) -- slow = 1500 ms
- `a`, `b` (`"head" | "body-end" | "defer" | "async" | "module"`) -- script A 1200 ms, script B 400 ms
- `inline` (`"0" | "1"`) -- inline script right after the stylesheet

#### LoadReport (new, `render-lab.schema.ts`, shared with the client)

- `run` (string)
- `events` (`{ kind: "ran" | "error" | "interactive" | "dcl" | "load"; name?: "a" | "b" | "inline" | "css"; t: number; sawContent?: boolean }[]`)
- `resources` (`{ name: "a" | "b" | "css"; start: number; end: number }[]`)
- `firstPaint` (`number | null`), `hidden` (boolean -- the tab was hidden during the run)

### Relationships

LoadSetup → server builds one sample HTML document → it loads up to three assets → each asset and the document push events into one LoadReport, posted once at `load` (every script, async ones included, and the stylesheet delay `load`, so `load` is the end of a run).

### API Contracts

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/handbook/render/page` | GET | LoadSetup as query | `text/html`, `Cache-Control: no-store`: the sample document |
| `/api/handbook/render/asset` | GET | `run`, `name` (`a`/`b`/`css`), `delay` (0–3000) | after `delay` ms: `text/javascript` (pushes a `ran` event with `sawContent`) or `text/css`; `no-store` |
| both | GET | invalid params | 422 `{ error: { message, issues } }` |

### Currently Exposed Fields

No AC reads existing fields; all displayed fields are new (LoadReport above).

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-001 | page title/summary/written | `src/practices/catalog.ts:193-222` | no | must add entry |
| AC-004 | resource arrival, script ran, parser end, DCL, load | new `render-lab.schema.ts` | no | must add |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Script-loading sample page is a **real document served by an API route** in a visible same-origin iframe, not `srcdoc` | The HTML arrives over the network like a real page; Resource and Paint Timing are relative to that document's own time origin; the server builds the HTML only from validated enums, so no learner text is ever served |
| Slow assets via a server delay with a unique `run` per load and `no-store` | Real downloads with controlled timing; no cache reuse between runs |
| Report via one `postMessage` at `load` (target `location.origin`; parent checks `event.origin` and `event.source`) | One message, no polling; stale runs are ignored by `run` and the iframe is remounted (`key`) per run, so an old run can't paint into the new timeline |
| Parsing demo uses a sandboxed `srcdoc` iframe with `allow-same-origin` and no `allow-scripts`, debounced 300 ms | Real parsing, cascade and computed style of the learner's markup, with scripts in it inert |
| Render tree is derived from computed styles and labelled simplified | Matches the real rules for the cases taught; engines' internal trees differ in detail |
| Stage diagram is a static table per property (layout/paint/composite) | Pages can't observe stages; the table reflects engine behavior for these properties and is labelled simplified |
| Frame meter counts **main-thread** frames (rAF) and the demo says so; compositor smoothness is shown visually with a transform reference box | Compositor frames aren't visible to page scripts; claiming a measured compositor fps would be false (spec AC-006/007 narrowed accordingly) |
| Busy main thread = 150 ms busy-wait every 200 ms while the animation plays | Clearly visible freezes, page stays usable between chunks |
| Forced-layout count derived from the pattern; elapsed time measured with `performance.now()` | No API counts layouts; time is the real proof |
| Timeline drawn with plain divs scaled to the run's end time | No chart dependency; four rows of bars |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| catalog | `src/practices/catalog.ts` | modify | `rendering` page in browser-platform, after origins-and-cors |
| page route | `src/app/(playground)/browser-platform/rendering/page.tsx` | new | renders the handbook in `TopicFrame` |
| content | `src/handbook/rendering/content.tsx` | new | intro, TOC, four topics, links to Networking and Performance |
| tree model | `src/handbook/rendering/render-tree.ts` | new | `domTree(doc)`, `renderTree(doc)`, `matchedRules(el)` on an iframe document |
| ParsingDemo | `src/handbook/rendering/parsing-demo.tsx` | new (client) | presets, HTML/CSS editors, sandboxed preview, DOM tree, render tree, node details |
| loading model | `src/handbook/rendering/loading.ts` | new | presets, `explain(setup, report)` (what blocked what, in words), timeline scale |
| LoadingDemo | `src/handbook/rendering/loading-demo.tsx` | new (client) | setup controls, iframe per run, timeout (10 s), timeline, explanation |
| stages model | `src/handbook/rendering/stages.ts` | new | properties → stages + keyframes |
| PipelineDemo | `src/handbook/rendering/pipeline-demo.tsx` | new (client) | property picker, stage diagram, play/pause, busy toggle, main-thread meter, reference box, reduced-motion note |
| ThrashDemo | `src/handbook/rendering/thrash-demo.tsx` | new (client) | count picker, run both modes, times + forced layouts + code |
| render-lab schema | `src/server/handbook/render-lab.schema.ts` | new | `loadSetupSchema`, `assetParamsSchema`, `LoadReport` type |
| render-lab service | `src/server/handbook/render-lab.service.ts` | new | `samplePage(setup)` HTML, `slowAsset(params)` |
| routes | `src/app/api/handbook/render/page/route.ts`, `.../render/asset/route.ts` | new | thin adapters |
| Performance content | `src/handbook/performance/content.tsx` | modify | link from the critical-path point on CSS and scripts |

## Data Flow

```mermaid
sequenceDiagram
  participant D as LoadingDemo
  participant F as iframe (sample page)
  participant S as /api/handbook/render
  D->>F: mount key=run, src=/page?run&css&a&b&inline
  F->>S: GET page (HTML built from setup)
  F->>F: inline logger first in head (before the stylesheet)
  F->>S: GET asset css / a / b (each waits its delay)
  S-->>F: css / js (js logs "ran", sawContent)
  F->>F: readystatechange interactive, DOMContentLoaded, load
  F->>D: postMessage LoadReport (events, resource timing, first paint, hidden)
  D->>D: ignore if run differs; draw timeline + explain()
```

Parsing: textarea change → 300 ms debounce → `srcdoc` = sample with the CSS in a `<style>` → iframe `load` → `domTree`/`renderTree` → two trees; selecting a node shows `matchedRules` and computed display/visibility.

Pipeline: play → `el.animate(keyframes, { iterations: Infinity, direction: "alternate" })` on the chosen box and a transform reference → rAF loop records frame gaps (fps, longest frame) → busy toggle starts a 200 ms interval with a 150 ms busy-wait → pause/unmount cancels all three.

Thrash: run → reset widths → time interleaved loop (read `offsetWidth`, write `style.width`) → reset → time batched (all reads, then all writes) → show both times, forced layouts N vs 1, and the two code snippets.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | catalog, route, content, Performance link | `src/practices/catalog.ts`, `.../rendering/page.tsx`, `src/handbook/performance/content.tsx` | Done |
| AC-002 | render-tree, ParsingDemo | `src/handbook/rendering/render-tree.ts`, `parsing-demo.tsx` | Done |
| AC-003 | render-tree, ParsingDemo | same | Done |
| AC-004 | render-lab schema/service/routes, LoadingDemo | `src/server/handbook/render-lab.*`, `src/app/api/handbook/render/*`, `loading-demo.tsx` | Done |
| AC-005 | loading model, LoadingDemo | `loading.ts`, `loading-demo.tsx` | Done |
| AC-006 | stages model, PipelineDemo | `stages.ts`, `pipeline-demo.tsx` | Done |
| AC-007 | PipelineDemo | `pipeline-demo.tsx` | Done |
| AC-008 | ThrashDemo | `thrash-demo.tsx` | Done |
| AC-009 | content | `content.tsx` | Done |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | none in repo; quality gate + scripted checks as in 018/019 |
| Command | `pnpm typecheck && pnpm lint && pnpm build` |
| Location | throwaway scripts in the session scratchpad |

### Reference Tests

| File | What It Tests |
|------|---------------|
| 019 audit SC1 | Puppeteer script per demo, axe in both themes, 360 px |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| render-lab routes | curl | page HTML per setup; asset waits its delay; 422 on bad params |
| loading model | node script | `explain()` for slow CSS + inline, classic head, defer order, async arrival order |
| LoadingDemo | Puppeteer | classic head vs defer (first paint and DCL order), two async in arrival order, rerun drops old run |
| ParsingDemo | Puppeteer | `display:none` out of render tree, `visibility:hidden` marked, `<p>one<p>two` fixed, `::before` shown |
| PipelineDemo | Puppeteer + visual | stages per property; busy toggle lowers main-thread fps; reduced motion doesn't autoplay |
| ThrashDemo | Puppeteer | batched faster than interleaved at 500 |
| page | Puppeteer + axe | both themes, 360 px, no sideways scroll |

## Considerations

### Error Handling

- Asset `onerror` attributes push `error` events; a 10 s timeout without a report shows "the sample page didn't finish" with the events seen so far; the demo stays usable.
- A tab hidden during a run sets `hidden`; the timeline is marked unreliable.
- Empty or broken sample HTML still parses (the parser always builds a document); an empty render tree says "nothing to render".

### Security

- The sample page HTML is built only from enum values and a validated run id; learner-typed HTML only goes into the parsing demo's `srcdoc` iframe, which can't run scripts.
- `delay` capped at 3000 ms; asset names are an enum; responses are `no-store`.
- `postMessage` uses `location.origin` as target; the parent checks `event.origin` and `event.source`.

## Open Questions

- [x] Paint Timing inside the iframe: reported in Chrome (first paint ~155 ms with defer, ~1,560 ms with everything blocking). Firefox and Safari not checked; the timeline says "not reported by this browser" when an entry is missing.

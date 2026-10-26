---
id: "016"
feature: performance-handbook
created: 2026-10-08
---

# Technical Design: Performance Handbook

## Scope

In: open the Performance & Accessibility section (catalog, sidebar folder, home
card, section page), the Performance page with seven topics and seven client
demos, and an Accessibility coming-soon page. Out: Accessibility content, any
API route (every demo runs in the browser), changes to React Practices.

## Research Summary

- web.dev *Learn Performance* modules (welcome → web workers) grouped into seven topics (decisions D1, D5).
- Next 16 docs: `import()` code-splits on demand (`02-guides/lazy-loading.md`); Turbopack bundles `new Worker(new URL("./x.ts", import.meta.url))` (worker asset prefix in `03-api-reference/08-turbopack.md`).
- Browser APIs used: `PerformanceObserver` with `buffered: true` for `navigation`, `paint`, `largest-contentful-paint`, `layout-shift`, `event` (`durationThreshold: 16`), `longtask`; `performance.getEntriesByType("resource")` for chunk `transferSize`; `MessageChannel` to yield between 8 ms slices (`scheduler.yield` starved rendering, see knowledge).
- Vitals definitions: CLS = largest session window (gap < 1 s, window ≤ 5 s) of shifts without recent input; INP ≈ the slowest interaction (by `interactionId`) while there are fewer than 50 interactions; LCP stops updating at the first input or scroll.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Catalog drives navigation | sections + entries in `src/practices/catalog.ts` | hard-coded links in the sidebar/home | `src/practices/catalog.ts` |
| Page header | Breadcrumbs, status badge, h1, summary | new header styles | `src/components/playground/practice-frame.tsx` |
| Demo container | `DemoStage` (error boundary, "Live demo" label) | bare divs | `src/components/playground/demo-stage.tsx` |
| Advice blocks | `DoAvoid`, `KeyIdeas` | new list styles | `src/components/playground/practice-guide.tsx` |
| Measuring outside React | refs/module values read on a timer or on completion | setState per frame | `src/practices/large-dataset/metrics.ts` |
| Handlers | named `handleX`, one-line inline only | multi-line inline handlers | `.claude/rules/05-event-handlers.md` |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| Breadcrumbs | `src/components/playground/breadcrumbs.tsx` | import |
| StatusBadge | `src/components/playground/status-badge.tsx` | import (Built = written) |
| DemoStage | `src/components/playground/demo-stage.tsx` | wrap each demo |
| DoAvoid | `src/components/playground/practice-guide.tsx` | per topic |
| Switch-like controls | `src/components/ui/checkbox.tsx`, `button.tsx` | toggles and actions |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| Section page entry | One page in the Performance & Accessibility folder |
| Waterfall request | One simulated request in the critical-path model |
| Run result | One long-task run (mode, total, longest task, dropped frames, answer) |

#### Section page entry (catalog)

- `slug` ("performance" \| "accessibility"), `title`, `summary`, `written` (boolean)

#### Waterfall request (critical-path model)

- `id`, `label`, `start` (ms), `end` (ms), `blocking` (boolean), `note` (why it starts/ends there)
- model output also has `fcp` and `lcp` (ms) and `reasons` (one line per enabled option)

### API Contracts

None.

## Decisions

| Decision | Rationale |
|----------|-----------|
| Generic sidebar folder for any section with children | The second folder shouldn't copy 60 lines; later sections plug in the same way |
| Section progress helper (`done`/`total`/noun) for home cards | Home card logic stays one code path for both sections |
| Page content in `src/handbook/performance/`, route at `app/(playground)/performance-accessibility/performance/page.tsx` | Mirrors `src/practices/{slug}` + one route per page (per-page code splitting, see knowledge) |
| Critical path as a pure model (`critical-path.ts`) rendered as percent-positioned bars | Deterministic, testable, fits 360 px without a chart library; a text list gives the same data to screen readers |
| Vitals collected in one client component with its own observers, values in state updated only on new entries | Few updates; nothing per frame |
| Long-task indicator moved by `requestAnimationFrame` (not a CSS animation) | CSS transform animations run on the compositor and would keep moving during a long task, hiding the point |
| Box blur of a generated 1200×750 image as the heavy work (D6), same functions in all three modes | Realistic worker job (image processing, as in the course); chunkable by row bands; pixels sent with a transferable `ArrayBuffer`; equal checksums prove equivalence |
| HTML delivery and font display as simulated models | Network distance, edge caches and font timing can't be changed from inside the page; labelled "simulated" like the waterfall |
| Code-splitting delay: real chunk load + a labelled simulated network delay (600 ms) | Local loads take a few ms; the delay makes prefetch savings visible, and is shown separately from the real measured time |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| catalog | `src/practices/catalog.ts` | modify | section href; `perfA11yPages`; `topicHref`, `getTopicPage`; `sectionProgress` |
| PracticeNav | `src/components/playground/practice-nav.tsx` | modify | generic `SectionFolder` for React Practices and Performance & Accessibility; filter across both |
| AppSidebar | `src/components/playground/app-sidebar.tsx` | modify | pass folder items for both sections |
| Home page | `src/app/(playground)/page.tsx` | modify | progress per section from `sectionProgress` |
| TopicFrame | `src/components/playground/topic-frame.tsx` | new | header for section pages (breadcrumbs, badge, title, summary) + children |
| Section page | `src/app/(playground)/performance-accessibility/page.tsx` | new | page cards |
| Performance page | `src/app/(playground)/performance-accessibility/performance/page.tsx` | new | renders the handbook |
| Accessibility page | `src/app/(playground)/performance-accessibility/accessibility/page.tsx` | new | coming-soon placeholder |
| Handbook content | `src/handbook/performance/content.tsx` | new | intro, TOC, seven `Topic` sections with key points, DoAvoid, web.dev links, demo slots |
| Topic | `src/handbook/performance/topic.tsx` | new | section layout (h2 with anchor, body, demo, advice, links) |
| VitalsMeter | `src/handbook/performance/vitals-meter.tsx` | new (client) | TTFB/FCP/LCP/CLS/INP of this page with ratings |
| vitals | `src/handbook/performance/vitals.ts` | new | thresholds + `rate(metric, value)` |
| HTML delivery model | `src/handbook/performance/html-delivery.ts` | new | `deliver(options)` → phases (DNS, connect, redirect, server, download), TTFB, done |
| HtmlDeliveryDemo | `src/handbook/performance/html-delivery-demo.tsx` | new (client) | CDN / edge cache / Brotli / redirect switches, stacked bar, totals |
| FontDisplayDemo | `src/handbook/performance/font-display-demo.tsx` | new (client) | arrival-time choice, Play, three panels (block/swap/optional) driven by one clock |
| critical path model | `src/handbook/performance/critical-path.ts` | new | `simulate(options)` → requests, fcp, lcp, reasons |
| CriticalPathDemo | `src/handbook/performance/critical-path-demo.tsx` | new (client) | toggles, waterfall bars, markers, text list |
| LayoutShiftDemo | `src/handbook/performance/layout-shift-demo.tsx` | new (client) | reserve toggle, delayed image, measured shift; responsive pick |
| CodeSplitDemo | `src/handbook/performance/code-split-demo.tsx` | new (client) | on-demand `import()`, prefetch on intent, timings, size |
| heavy report | `src/handbook/performance/heavy-report.tsx` | new | the lazily loaded component |
| LongTaskDemo | `src/handbook/performance/long-task-demo.tsx` | new (client) | three modes, rAF indicator, input box, blurred image, results table |
| blur | `src/handbook/performance/blur.ts` | new | `makePhoto`, `blurInBands` generator (row bands), `blurAll`, `checksum`, shared by main thread and worker |
| worker | `src/handbook/performance/blur.worker.ts` | new | blurs a transferred pixel buffer off the main thread and transfers it back |

## Data Flow

1. Server page renders the header, text and `DemoStage`s; each demo is a small client leaf.
2. VitalsMeter: observers (buffered) → reduce entries to values → state → rated cards.
3. CriticalPathDemo: options state → `simulate()` (pure) → bars + markers + text.
4. LayoutShiftDemo: Load → img present without `src` → after 1 s set `src` → `layout-shift` observer sums entries whose sources are inside the demo → result.
5. CodeSplitDemo: intent (hover/focus) or click → `import("./heavy-report")` + simulated delay → resource entries that appeared during the load → time + bytes.
6. LongTaskDemo: Run(mode) → work (sync / row bands with MessageChannel yields / worker with transferred buffer) while a rAF loop moves the indicator and counts gaps and a `longtask` observer records the longest → result row.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | PracticeNav, AppSidebar, catalog | practice-nav.tsx, app-sidebar.tsx, catalog.ts | Done |
| AC-002 | Section page, Home page | performance-accessibility/page.tsx, (playground)/page.tsx | Done |
| AC-003 | TopicFrame, Performance/Accessibility pages, content | topic-frame.tsx, routes, content.tsx | Done |
| AC-004, AC-005 | VitalsMeter, vitals | vitals-meter.tsx, vitals.ts | Done |
| AC-006, AC-007 | critical path model, CriticalPathDemo | critical-path.ts, critical-path-demo.tsx | Done |
| AC-008, AC-009 | LayoutShiftDemo | layout-shift-demo.tsx | Done |
| AC-010, AC-011 | CodeSplitDemo, heavy report | code-split-demo.tsx, heavy-report.tsx | Done |
| AC-012, AC-013 | LongTaskDemo, blur, worker | long-task-demo.tsx, blur.ts, blur.worker.ts | Done |
| AC-015, AC-016 | HTML delivery model + demo | html-delivery.ts, html-delivery-demo.tsx | Done |
| AC-017 | FontDisplayDemo | font-display-demo.tsx | Done |
| AC-018 | content | content.tsx | Done |
| AC-014 | content, Topic | content.tsx, topic.tsx | Done |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | none (no test runner in the repo) |
| Command | `pnpm typecheck && pnpm lint && pnpm build` + browser checks |
| Location | scratch scripts outside the repo |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| critical path model | scratch Node script | all-off and all-on FCP/LCP; each option alone moves a marker earlier or the font earlier |
| demos | Puppeteer on `pnpm start` | vitals fill in; CLS > 0 vs 0; prefetch saves time; one-go drops frames, worker doesn't; same checksum; axe both themes; 360 px |

## Considerations

### Error Handling

- Each demo sits in `DemoStage` (error boundary with retry). Unsupported observer types are detected with `PerformanceObserver.supportedEntryTypes` and shown as "not supported". A failed chunk load shows an error with Retry.

### Security

- None (no input leaves the browser).

## Open Questions

- None.

---
id: "018"
feature: networking-handbook
created: 2026-10-08
---

# Technical Design: Networking Handbook

## Scope

In: generalize the topic-page catalog to several sections, open Browser &
Web Platform (catalog, sidebar folder, home card, section page), the
Networking page with six topics and six demos, and two API routes for the
real-request demos. Out: other Browser & Web Platform pages, changes to the
Performance & Accessibility pages' content.

## Research Summary

- Round trips: DNS ~1 RTT (uncached), TCP handshake 1 RTT, TLS 1.3 1 RTT (TLS 1.2 2 RTT), QUIC (HTTP/3) transport + TLS in 1 RTT, a reused connection skips all three; the request then takes 1 RTT plus server time.
- TCP slow start: initial congestion window 10 segments (MSS ~1,460 B, ~14 KB); the window doubles each round trip until a loss, then halves and grows by one segment per round (congestion avoidance). The model loses one segment after 150 sent ("one packet lost") or one in every 150 (~0.7%), so the first loss is the same in both settings.
- HTTP/1.1: browsers open up to 6 connections per host, one request at a time each; HTTP/2: one connection, multiplexed streams, but TCP delivers in order so one lost packet stalls every stream (head-of-line blocking); HTTP/3: QUIC streams are independent.
- Fetch and caching: `fetch()` exposes a revalidated 304 to script as the cached 200; Resource Timing `transferSize` is 0 for a browser-cache hit and only the header size for a 304 (same-origin); `response.redirected` and `response.url` show a followed redirect.
- `nextHopProtocol` on navigation and resource entries gives the real protocol (`http/1.1`, `h2`, `h3`); `isSecureContext` is true on HTTPS and on localhost.
- ui-ux-pro-max guidance as in features 016/017 (same layout, tokens, text verdicts, 360 px).

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Handbook page | `TopicFrame` + `src/handbook/{page}/content.tsx` + `Topic`/`Toc` + one labelled `DemoStage` per demo | new page header | `src/handbook/accessibility/content.tsx` |
| Simulated models | pure modules, deterministic, labelled "simulated" | random values | `src/handbook/performance/html-delivery.ts` |
| API routes | thin route → `src/server/{domain}/*.service.ts` (`server-only`), Zod schema shared | logic in the route | `src/app/api/practices/debounced-search/search/route.ts` |
| Mock server state | `globalThis` map (survives HMR, shared by routes) | module state per route | knowledge feature 006 |
| Run ids | per-run id in the URL so runs don't share caches/counters | reusing URLs | knowledge feature 012 |
| Handlers | named `handleX` | multi-line inline handlers | `.claude/rules/05-event-handlers.md` |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| Topic, Toc | `src/handbook/topic.tsx`, `src/handbook/toc.tsx` | import |
| Toggle, Verdict | `src/handbook/accessibility/ui.tsx` | move to `src/handbook/ui.tsx` (shared), keep a11y-only parts there |
| TopicFrame | `src/components/playground/topic-frame.tsx` | derive the section from the page |
| jsonError | `src/lib/http.ts` | error responses |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| Topic page (catalog) | A page in a section folder: `section`, `slug`, `title`, `summary`, `written` |
| Echo result | What the server received: method, path + query, headers, body |
| Cache log entry | One request the cache endpoint received: number, rule, answer (200/304) |

### API Contracts

#### `GET|POST|PUT|DELETE /api/handbook/http?status=NNN`

- `status` (Zod enum: 200, 201, 204, 301, 400, 401, 404, 429, 500, 503; default 200).
- Answers with that status. Body (except 204): `{ data: { received: { method, url, headers, body } } }`; 301 → `Location: /api/handbook/http?status=200&redirectedFrom=301`; 401 → `WWW-Authenticate`; 429/503 → `Retry-After: 30`. Always `Cache-Control: no-store`.
- Body over 2 KB → 422 via `jsonError`. Note: fetch follows a 301 after a POST with a GET (as browsers do), so the echo then shows GET.

#### `GET /api/handbook/cache?rule=no-store|max-age|etag&run=ID`

- Counts each request per run on the server and records whether it answered 200 or 304.
- `no-store` → `Cache-Control: no-store`; `max-age` → `Cache-Control: private, max-age=300`; `etag` → `Cache-Control: no-cache` + `ETag: "ID"`, and 304 when `If-None-Match` matches.
- Body: `{ data: { version: 1, servedAt } }`.

#### `GET /api/handbook/cache/log?run=ID`

- `{ data: { entries: [{ n, rule, status }] } }`, `Cache-Control: no-store`.

## Decisions

| Decision | Rationale |
|----------|-----------|
| One `topicPages` list with a `section` field (slugs unique) replaces `perfA11yPages`; `topicHref`, `sectionPages(id)`, `sectionProgress` read it | One code path for every section folder, home card and section page |
| Shared `SectionIndex` component for section pages | The two section pages differ only in text |
| `/browser-platform` route prefix (section id) | Matches the id used in the catalog |
| Real requests only to this site (`/api/handbook/*`) | No third-party calls; status, headers and caching fully controlled |
| Cache verdict from Resource Timing (`transferSize`) + the server's own log | Script can't see a 304 (fetch shows 200); the server log proves whether it was reached and what it answered |
| Version waterfall in RTT units (setup + one RTT per file, 6 connections for HTTP/1.1) | Simple enough to read at a glance; shows handshakes, multiplexing and head-of-line blocking |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| catalog | `src/practices/catalog.ts` | modify | `BROWSER_PATH`, section href, `topicPages`, `sectionPages`, `sectionPath`, `sectionProgress` |
| AppSidebar | `src/components/playground/app-sidebar.tsx` | modify | Browser & Web Platform folder |
| TopicFrame | `src/components/playground/topic-frame.tsx` | modify | section from `page.section` |
| SectionIndex | `src/components/playground/section-index.tsx` | new | header, progress, page cards |
| Section pages | `src/app/(playground)/{performance-accessibility,browser-platform}/page.tsx` | modify / new | render `SectionIndex` |
| Networking page | `src/app/(playground)/browser-platform/networking/page.tsx` | new | renders the handbook |
| shared ui | `src/handbook/ui.tsx` | new (moved) | `Toggle`, `Verdict` |
| Topic | `src/handbook/topic.tsx` | modify | `linksLabel` prop (default "Read more on web.dev:"); this page says "Read more:" |
| content | `src/handbook/networking/content.tsx` | new | intro, TOC, six topics |
| journey model + demo | `.../journey.ts`, `.../journey-demo.tsx` | new | round trips to first byte |
| slow start model + demo | `.../slow-start.ts`, `.../slow-start-demo.tsx` | new | window per round trip |
| HttpDemo | `.../http-demo.tsx` | new (client) | request builder, real response |
| CacheDemo | `.../cache-demo.tsx` | new (client) | three rules, fetch twice, verdicts + server log |
| versions model + demo | `.../versions.ts`, `.../versions-demo.tsx` | new | waterfall + this page's real protocols |
| HttpsDemo | `.../https-demo.tsx` | new (client) | observer view + secure-context facts |
| echo service + schema | `src/server/handbook/http-echo.{service,schema}.ts` | new | status handling, echo |
| cache service | `src/server/handbook/cache-lab.service.ts` | new | per-run counter and log on `globalThis` |
| routes | `src/app/api/handbook/http/route.ts`, `.../cache/route.ts`, `.../cache/log/route.ts` | new | thin adapters |

## Data Flow

1. Server page renders header and notes; each demo is a client leaf.
2. Models: settings state → pure function → bars and totals.
3. HttpDemo: form → `fetch` with method/body → response status/headers/body + time; the body contains what the server received.
4. CacheDemo: Fetch → `fetch(url)` (default cache mode) → Resource Timing entry for that URL → then `GET …/cache/log` → row (status to script, bytes transferred, verdict, server count).

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001, AC-002 | catalog, AppSidebar, SectionIndex, TopicFrame, routes | as above | Done |
| AC-003 | journey | journey.ts, journey-demo.tsx | Done |
| AC-004 | slow start | slow-start.ts, slow-start-demo.tsx | Done |
| AC-005 | HttpDemo, echo service, route | http-demo.tsx, http-echo.*, api/handbook/http | Done |
| AC-006 | CacheDemo, cache service, routes | cache-demo.tsx, cache-lab.service.ts, api/handbook/cache | Done |
| AC-007, AC-008 | versions | versions.ts, versions-demo.tsx | Done |
| AC-009, AC-010 | HttpsDemo | https-demo.tsx | Done |
| AC-011 | content | content.tsx | Done |

## Test Strategy

| Aspect | Detail |
|--------|--------|
| Framework | none (no test runner) |
| Command | `pnpm typecheck && pnpm lint && pnpm build` + browser checks |
| Scenarios | model values (Node scripts); curl the routes (status, headers, 304); Puppeteer: demos react, cache verdicts per rule, axe both themes, 360 px |

## Considerations

### Error Handling

- Routes validate with Zod (422 on bad params). Demos catch fetch errors and show them in an alert; invalid JSON body is rejected before sending.

### Security

- Echo returns only the request's own headers to the same browser; bodies capped at 2 KB; cache state is per run id and capped (oldest runs dropped after 200).

## Open Questions

- None.

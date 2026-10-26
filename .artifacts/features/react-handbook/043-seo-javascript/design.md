---
id: "043"
feature: seo-javascript
created: 2026-10-22
---

# Technical Design: SEO, JavaScript and rendering SEO

## Scope

In: lab pages at `/seo-lab/[lab]`, a header that keeps them out of the index, a shared "render in a frame" helper, and the page `/seo/javascript-seo` with five topics and five demos (three compare server HTML with the rendered page, one audits every route's metadata, one is a decision helper).
Out: social cards and JSON-LD (page 4), AI crawlers (page 5).

## Research Summary

> From .artifacts/research/seo-fundamentals.md, "JavaScript SEO" and "Next.js streaming metadata"

- Render queue; recent Chrome; no interaction, no permissions, storage and cookies cleared between loads; `noindex` pages may not be rendered.
- History API over fragments; `<a href>` only; soft 404 fixes: real 404 or `noindex` on the error view.
- Lazy loading on viewport entry works; scroll and click handlers don't; infinite scroll needs paginated URLs.
- Dynamic rendering is a workaround; server, static or hydrated rendering is the recommendation.
- Next.js streams async metadata into `<body>` for JS-capable bots and blocks for `htmlLimitedBots`; static routes have it in `<head>`.

## Patterns & Reuse

| Pattern | Project Uses | Reference |
|---------|-------------|-----------|
| Read server HTML | `inspectPage` (fetch + `DOMParser`) | src/handbook/seo/inspect.ts |
| Sitemap URLs + parallel fetch | `parseSitemap`, worker pool | src/handbook/seo/crawling/sitemap-demo.tsx (moved to `crawling/sitemap.ts`) |
| Robots header by path | next.config `headers()` | next.config.ts |
| Select, toggles, retry | `FieldSelect`, `Choice`, `FetchError` | src/handbook/seo/ |

## Data Model

| Entity | Purpose |
|--------|---------|
| `LABS` (new, plain module) | slug, title, what it shows, marker sentences (id, text, how it's added) |
| `readDocument(doc)` (refactor of `inspectPage`) | fields from any `Document`, so a rendered frame and server HTML are read the same way |
| `renderInFrame(path, after?)` (new, client) | loads the path in a hidden same-origin iframe, waits for load plus a settle delay (timeout 8 s), returns a snapshot; `after` runs actions (click, scroll) and returns a second snapshot |
| Strategy model (new) | answers → strategy, reason, code, cost |

### API Contracts

| Endpoint | Method | Response |
|----------|--------|----------|
| /seo-lab/{server, client, client-title, soft-404, soft-404-noindex, links, interaction} | GET | 200 HTML, `X-Robots-Tag: noindex` |
| /seo-lab/{anything else} | GET | 404 |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Lab pages live at `/seo-lab/[lab]`, outside the `(playground)` layout | Small pages without the sidebar, so their HTML shows only the case; static params, `dynamicParams = false` gives real 404s |
| Keep lab pages out of search with an `X-Robots-Tag` header, not a meta tag | The soft-404 cases compare the page's own robots meta; a lab-wide meta tag would mask the difference |
| Render in a same-origin hidden iframe and read `contentDocument` | It runs the page's real JavaScript in the reader's browser, the closest a page can get to a renderer; the differences are stated next to the demo |
| The interaction lab loads content on the `scroll` event, not with `IntersectionObserver` | Google doesn't scroll, so scroll-event content is missed; an offscreen frame can't show `IntersectionObserver` behaving like Google's tall viewport, so that case is explained in text only |
| Interaction "after" snapshot clicks `[data-lab-action]` and scrolls the frame to the bottom | Shows the content is real, just unreachable without interaction |
| Metadata audit flags titles over 60 and descriptions over 160 characters as "may be cut off" | Google truncates by pixel width; the character counts are labelled as rough guides |

## Component Design

| Component | File | Action |
|-----------|------|--------|
| Labs data | src/handbook/seo/javascript/labs.ts | new |
| Lab route | src/app/seo-lab/[lab]/page.tsx | new |
| Lab client parts | src/handbook/seo/javascript/lab-client.tsx | new |
| next.config | next.config.ts | modify (`/seo-lab/:path*` header) |
| `readDocument` | src/handbook/seo/inspect.ts | modify |
| Sitemap helpers | src/handbook/seo/crawling/sitemap.ts | new (moved from sitemap-demo) |
| `renderInFrame` | src/handbook/seo/javascript/render-frame.ts | new |
| RenderCompare (topic 1) | src/handbook/seo/javascript/render-demo.tsx | new |
| StrategyDemo (topic 2) | src/handbook/seo/javascript/strategy.ts, strategy-demo.tsx | new |
| MetadataAudit (topic 3) | src/handbook/seo/javascript/metadata-audit.tsx | new |
| LinksDemo (topic 4) | src/handbook/seo/javascript/links-demo.tsx | new |
| InteractionDemo (topic 5) | src/handbook/seo/javascript/interaction-demo.tsx | new |
| Content + route | src/handbook/seo/javascript/content.tsx, src/app/(playground)/seo/javascript-seo/page.tsx | new |
| Catalog | src/practices/catalog.ts | mark written |

## Requirements Traceability

| Requirement | File | Status |
|-------------|------|--------|
| AC-001, AC-002 | seo-lab/[lab]/page.tsx, labs.ts, lab-client.tsx, next.config.ts | Done |
| AC-003, AC-004 | content.tsx, render-demo.tsx, render-frame.ts | Done |
| AC-005, AC-006 | content.tsx, strategy.ts, strategy-demo.tsx | Done |
| AC-007, AC-008 | content.tsx, metadata-audit.tsx | Done |
| AC-009, AC-010 | content.tsx, links-demo.tsx | Done |
| AC-011, AC-012 | content.tsx, interaction-demo.tsx | Done |
| AC-013 | content.tsx | Done |

## Test Strategy

- `curl` each lab: status, `x-robots-tag`, marker text present or absent in the server HTML; an unknown lab is 404; labs absent from the sitemap.
- Browser: each comparison shows the expected markers per column; the links audit marks exactly the `<a href>` links as crawlable; soft-404 flagged, the `noindex` variant and the real 404 not; the metadata audit reports zero problems.
- axe light and dark, 360 px, keyboard; quality gates.

## Considerations

- Security: frames load only fixed same-origin lab paths; no user-supplied URL.
- The frame is `aria-hidden`, `tabIndex={-1}`, offscreen, and removed after each run.

## Open Questions

- None

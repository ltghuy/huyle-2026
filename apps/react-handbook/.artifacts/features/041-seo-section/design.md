---
id: "041"
feature: seo-section
created: 2026-10-22
---

# Technical Design: SEO section + "How search works"

## Scope

In: the eighth section `seo` (catalog, icon, sidebar folder and page search, home copy and references, README), its section index with a level per page, a fallback route for the five unwritten pages, and the page `/seo/how-search-works` with a skill map, five topics and five demos.
Out: the content and the real setup of pages 2 to 6 (robots, sitemap, canonical, metadata, JSON-LD, `llms.txt`, CI checks).

## Research Summary

> From .artifacts/research/seo-fundamentals.md

- Google documents three stages (crawling, indexing, serving); rendering happens during crawling with a recent Chrome. Discovery is from links, sitemaps and known pages.
- The Page indexing report's current reason names (for example "URL blocked by robots.txt", "URL marked ‘noindex’") are used verbatim in the pipeline demo.
- robots.txt doesn't keep a page out of the index, and a crawler must fetch a page to see `noindex`.
- Only `<a href>` links are reliably crawled; `nofollow` is a hint.
- Canonical signals: redirects and `rel="canonical"` are strong, sitemap inclusion is weak; HTTPS is preferred over HTTP.
- Every claim in the myth sorter has a primary-source quote in the research file.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Topic page | Server `content.tsx` with `TOPICS`, `Toc`, one `Topic` per topic, client demos as leaves | A client component for the whole page | src/handbook/testing/content.tsx |
| Route | `TopicFrame` + `topicMetadata(slug)` | Custom headers | src/app/(playground)/testing/strategy/page.tsx |
| Section | `SectionIndex` + `sectionMetadata` | | src/app/(playground)/testing/page.tsx |
| Unwritten pages | `[slug]` fallback with `generateStaticParams` of unwritten pages | 404s for planned pages | git 234025a `testing/[slug]/page.tsx` |
| "Read more" | `advice` (Do/Avoid) + `links` with `linksLabel: "Read more:"` | A new disclosure component | src/handbook/testing/content.tsx |
| Demo controls | `Choice` radios, `Toggle` cards, `Select`, `Button`, `Verdict` | Colour-only pass/fail | src/handbook/jwt/token-view.tsx, src/handbook/ui.tsx |
| Exercise | One `Choice` per item, reveal per item, summary when all are placed | Drag and drop | src/handbook/testing/classify-demo.tsx |
| Models | Labelled "simplified model", assumptions shown | Presenting a model as measured | knowledge.md feature:017 |
| Shared page lists | `NAV_FOLDERS` (plain module) | Importing data from a `"use client"` module | src/components/playground/nav-folders.ts, knowledge.md feature:036 |
| Handlers | `handleX`, one-line inline only | Multi-line inline handlers | .claude/rules/05-event-handlers.md |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `Topic`, `Toc` | src/handbook/topic.tsx, src/handbook/toc.tsx | import |
| `Choice` | src/handbook/jwt/token-view.tsx | import |
| `Toggle`, `Verdict` | src/handbook/ui.tsx | import |
| `TopicFrame`, `SectionIndex` | src/components/playground/ | import; `SectionIndex` gains the level badge |
| `NAV_FOLDERS` | src/components/playground/nav-folders.ts | crawl model nodes; crawler-view page list |
| shadcn `Button`, `Select`, `Table` | src/components/ui/ | import |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| `SectionId`, `sections`, `SEO_PATH`, `SECTION_PATH` | add `seo` |
| `TopicPageMeta`, `topicPages` | add six rows with an optional `level` |
| Pipeline model (new, client) | conditions, stages, the first stopping stage, report reason, fix, conflict notes |
| Crawl model (new, client) | nodes and link groups from `NAV_FOLDERS`, breadth-first crawl with per-group link style |
| Canonical model (new, client) | URL variants, signals and weights, chosen URL, agreement |
| Crawler view (new, client) | fetch a page, parse with `DOMParser`, extract fields, the page that adds each missing field |
| Claims (new, client) | claim, answer, reason, source link |

#### Catalog members touched

- `SectionId` -- src/practices/catalog.ts:10
- `TESTING_PATH` (neighbour for the new `SEO_PATH`) -- src/practices/catalog.ts:26
- `sections` -- src/practices/catalog.ts:28
- `TopicPageMeta` -- src/practices/catalog.ts:239 (gains `level?: PageLevel`)
- `topicPages` -- src/practices/catalog.ts:255
- `SECTION_PATH` -- src/practices/catalog.ts:450
- `ICONS` -- src/components/playground/section-icon.tsx:5
- `NAV_FOLDERS` -- src/components/playground/nav-folders.ts

### API Contracts

None. The crawler view fetches this site's own pages from the browser.

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-001 | section progress | src/practices/catalog.ts `sectionProgress` | yes (generic) | none |
| AC-002 | page level | none | no | must add (`level` on `TopicPageMeta`, shown by `SectionIndex`) |
| AC-003 | page dates | src/components/playground/topic-frame.tsx | yes | none |
| AC-008 | status, final URL | `Response.status`, `Response.redirected`, `Response.url` | yes | none |
| AC-008 | title | `<title>` in server HTML | yes | none |
| AC-008 | meta description | `<meta name="description">` | yes | none |
| AC-008 | canonical | `<link rel="canonical">` | no | shown missing, added by page 2 |
| AC-008 | meta robots / `X-Robots-Tag` | `<meta name="robots">`, response header | no (defaults apply) | shown as "not set, defaults to index, follow" |
| AC-008 | `h1`, other headings | server HTML | yes | none |
| AC-008 | links, amount of text | server HTML | yes | none |
| AC-009 | social card, structured data | `og:*` meta, `application/ld+json` | no | shown missing, added by page 4 |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Section id `seo`, title "SEO", path `/seo`, icon lucide `ScanSearch` | Short and the word readers search for; `Search` is already the page-search icon |
| Slugs: `how-search-works` (written), `crawling-indexing`, `javascript-seo`, `metadata-structured-data`, `ai-search`, `seo-at-scale` | Readable URLs, unique across sections |
| `level` is an optional field on topic pages, shown as a small badge on section cards when set | Only SEO needs it now; other sections are unchanged |
| The skill map is a server-rendered table in the page intro, before the topic list | Static content; the table reads well at 360 px when stacked per area |
| Crawler view fetches same-origin pages with `fetch()` and parses the text with `DOMParser`, which never runs scripts | It is what a crawler gets on the first fetch; no server route or self-fetch on Cloudflare needed. Redirects are followed by the browser, so the view shows "redirected to" from `Response.redirected` and `Response.url` |
| Crawler view page list: every page in `NAV_FOLDERS`, the home page, `/practices` (a real permanent redirect in next.config) and a made-up path (a real 404) | Real cases for the redirect and error edge cases |
| Pipeline demo checks conditions in stage order (discover, crawl, render, index, serve) and stops at the first one that blocks; later conditions are listed as "never reached" with the conflict note | Matches how the stages depend on each other and explains `noindex` behind a robots block |
| Crawl model: nodes are the home page, section pages and every page; link groups are the home cards, the section cards and the sidebar (on every page). Each group gets a link style (real link, click handler, after a click, `nofollow`); only real links are followed; an orphaned page loses every link; a sitemap adds every page not found by links at "sitemap" depth | Built from the real page list, so it changes as the handbook grows; simple enough to explain in the assumptions list |
| Canonical model: points per signal (redirect 4, `rel="canonical"` 3, internal links 2, sitemap 1, HTTPS 1) and the highest total wins; signals agree when they all point at the winner | Mirrors Google's strong and weak wording; the numbers are listed as assumptions |
| Claim sorter reuses the classification pattern from the testing page | Keyboard friendly and already tested |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| catalog | src/practices/catalog.ts | modify | section, six pages, `level`, `SEO_PATH` |
| SectionIcon | src/components/playground/section-icon.tsx | modify | `ScanSearch` |
| NAV_FOLDERS | src/components/playground/nav-folders.ts | modify | `topicFolder("seo")` |
| SectionIndex | src/components/playground/section-index.tsx | modify | level badge |
| Home | src/app/(playground)/page.tsx | modify | copy mentions SEO; references group "SEO" |
| README | README.md | modify | section row |
| Section route | src/app/(playground)/seo/page.tsx | new | `SectionIndex` |
| Page route | src/app/(playground)/seo/how-search-works/page.tsx | new | `TopicFrame` + content |
| Fallback route | src/app/(playground)/seo/[slug]/page.tsx | new | placeholder for unwritten pages |
| HowSearchWorksHandbook | src/handbook/seo/content.tsx | new | intro, skill map, Toc, five Topics |
| SkillMap | src/handbook/seo/skill-map.tsx | new | areas by level, frontend-owned marks, page links |
| Pipeline model + demo | src/handbook/seo/pipeline.ts, pipeline-demo.tsx | new | AC-004, AC-005 |
| Crawl model + demo | src/handbook/seo/crawl.ts, crawl-demo.tsx | new | AC-006, AC-007 |
| Crawler view | src/handbook/seo/inspect.ts, crawler-view.tsx | new | AC-008, AC-009 |
| Canonical model + demo | src/handbook/seo/canonical.ts, canonical-demo.tsx | new | AC-010, AC-011 |
| Claims + sorter | src/handbook/seo/claims.ts, claims-demo.tsx | new | AC-013 |

## Data Flow

1. The server renders `content.tsx` text and the skill map; each demo hydrates as a client leaf.
2. Pipeline: toggled conditions → `runPipeline(conditions)` → stages with pass, stop or never reached, the report reason, the fix and conflict notes.
3. Crawl: link style per group, orphan, sitemap → `crawl(options)` → pages by depth, pages not found, share reached.
4. Crawler view: pick a path → `fetch(path)` → status, final URL, `X-Robots-Tag` → `DOMParser` → fields → render, with "added by page N" for missing ones. Errors show a retry button.
5. Canonical: variants and signal targets → `chooseCanonical(state)` → scores per URL, winner, agreement, advice.
6. Claims: per claim choice → reveal; summary when every claim is placed.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | catalog, SectionIcon, Home | catalog.ts, section-icon.tsx, page.tsx | Done |
| AC-002 | NAV_FOLDERS, SectionIndex, section and fallback routes | nav-folders.ts, section-index.tsx, seo/page.tsx, seo/[slug]/page.tsx | Done |
| AC-003 | Page route, TopicFrame, Toc | seo/how-search-works/page.tsx, content.tsx | Done |
| AC-004 | HowSearchWorksHandbook | content.tsx | Done |
| AC-005 | PipelineDemo | pipeline.ts, pipeline-demo.tsx | Done |
| AC-006, AC-007 | CrawlDemo | crawl.ts, crawl-demo.tsx | Done |
| AC-008 (status, final URL, title, description, canonical, robots, h1, headings, links, text) | CrawlerView | inspect.ts, crawler-view.tsx | Done |
| AC-009 | CrawlerView | inspect.ts (`ADDED_BY`) | Done |
| AC-010 | HowSearchWorksHandbook | content.tsx | Done |
| AC-011 | CanonicalDemo | canonical.ts, canonical-demo.tsx | Done |
| AC-012 | HowSearchWorksHandbook | content.tsx | Done |
| AC-013 | ClaimsDemo | claims.ts, claims-demo.tsx | Done |
| AC-014 | SkillMap | skill-map.tsx | Done |
| AC-015 | HowSearchWorksHandbook | content.tsx (advice + links per topic) | Done |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | No unit runner; checks run in a real browser (Puppeteer MCP) |
| Command | `pnpm typecheck && pnpm lint && pnpm build` |

### Checks

- Pipeline: no conditions shows "Page is indexed"; each condition alone shows its documented reason; robots block plus `noindex` shows the conflict note.
- Crawl: all groups real finds every page at depth 1 or 2; every group a click handler and no sitemap finds only the home page; an orphan is listed as not found unless the sitemap is on.
- Crawler view: a written page lists its title and headings; `/practices` shows the redirect; the made-up path shows 404; offline (fetch rejected) shows the retry.
- Canonical: conflicting signals are reported; HTTPS beats HTTP when the rest is equal.
- axe in light and dark, 360 px width with no horizontal scroll, keyboard use of every control.

## Considerations

- Error handling: the crawler view catches fetch and parse errors and shows them with a retry; no demo throws.
- Security: the crawler view only fetches paths from a fixed list on the same origin, and reads the HTML as text with `DOMParser` (scripts never run). No user-supplied URL is fetched.
- Accessibility: results update in `aria-live="polite"` regions; stages use icon plus word; selects and toggles have visible labels.

## Open Questions

- None

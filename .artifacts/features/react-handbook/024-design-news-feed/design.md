---
id: "024"
feature: design-news-feed
created: 2026-10-12
---

# Technical Design: Design a news feed

## Scope

In scope: a second System Design topic page `news-feed`
(`/system-design/news-feed`) with four topics, a theme-aware inline SVG
architecture diagram, a cursor-vs-offset pagination simulation, and an
optimistic-like simulation; a link from the method page. No server code, no new
dependency.

Out of scope: see spec.

## Research Summary

Knowledge chain: codebase (method page dataset, built practices) → established
handbook patterns. Pagination drift and optimistic rollback are deterministic
client logic; no external source or server needed.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Reference |
|---------|-------------|-----------|
| Topic page | catalog entry + route + `src/handbook/{slug}/content.tsx` with `Topic`/`Toc` | `src/app/(playground)/system-design/method/page.tsx` |
| Pickers / toggles | `Choice`, `Toggle` | `src/handbook/jwt/token-view.tsx`, `src/handbook/ui.tsx` |
| Pass/fail, labelled figures | `Verdict`; "example" labels | `src/handbook/ui.tsx`, method page |
| Theme-aware SVG | Tailwind `fill-*`/`stroke-*`/`text-*` on SVG nodes | new; tokens `fill-card stroke-border text-foreground` |
| Contrast-safe tinted text | darken token in light: `text-[color-mix(in_oklch,var(--x),black_25%)] dark:text-x` | knowledge feature:023 |
| Handlers | named `handleX`; one-line inline only | `.claude/rules/react-handbook/05-event-handlers.md` |

### Existing Code to Reuse

| Component | Location | How |
|-----------|----------|-----|
| `Topic`, `Toc` | `src/handbook/topic.tsx`, `toc.tsx` | the four topics |
| `TopicFrame`, `SectionIndex` | `src/components/playground/*` | header + section (already handle `system-design`) |
| `Choice`, `Toggle`, `Verdict` | jwt/token-view, handbook/ui | demo controls |
| feed data | `src/handbook/system-design/framework.ts` `PRODUCTS[feed]` | requirements come from here (consistency with the method page) |
| `practiceHref`, `topicHref` | `src/practices/catalog.ts` | link deep dives to built practices and back to the method |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| TopicPageMeta (catalog) | add `news-feed` page |
| FeedPost (client sim) | a post in the pagination/like simulations |
| PageResult (client sim) | one fetched page under offset vs cursor |

#### Catalog — `src/practices/catalog.ts`

- `topicPages[]`: append `{ section: "system-design", slug: "news-feed", title: "Design a news feed", summary, written: true }`. `system-design` is already an active topic section (feature 023), so sidebar/section/progress pick it up automatically.

#### Pagination sim (client, `pagination.ts`, no `server-only`)

- `FeedPost = { id: number; label: string }`
- A base list of posts (newest id highest). "New posts arrive" prepends N posts.
- `offsetPage(all, pageIndex, size) → FeedPost[]` (LIMIT/OFFSET against the current list — drifts when the list grows at the head)
- `cursorPage(all, cursorId, size) → { items; nextCursor }` (items strictly older than cursor — stable under head inserts)
- The demo tracks what the reader has already "seen" to highlight duplicates/skips.

#### Optimistic like (client, in the demo component)

- local post state `{ liked, count }`; like applies immediately; a simulated async "server" resolves after a short delay and, when rejection is on, throws → revert to the exact previous `{ liked, count }`.

### API Contracts

None (no server).

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Exposed? | Gap |
|-------|-------|--------------------|----------|-----|
| AC-001 | listed, 2/2, method link | `catalog.ts` topicPages/sectionProgress; `src/handbook/system-design/content.tsx` | partial | add row + link |
| AC-002 | breadcrumbs/title/intro | `topic-frame.tsx` | yes | none |
| AC-003..010 | case-study content | none | no | new |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Four topics: requirements+architecture, data+pagination, deep dives (list/media/interactions), freshness folded into deep dives | Mirrors the method's stages applied to a feed; keeps the hard parts together |
| Architecture diagram as inline theme-aware SVG, not an image | Sharp in both themes, no asset pipeline; Tailwind `fill-*`/`stroke-*` map to tokens |
| Pagination drift shown as a client simulation, labelled | Drift is deterministic logic; a simulation is the clearest, most honest way to show it — no server needed |
| Deep dives link to the built practices rather than re-demoing them | Those practices already implement virtualization, lazy images, infinite scroll, caching, optimistic real-time; linking avoids duplication and shows the real code |
| Requirements pulled from `framework.ts` `PRODUCTS[feed]` | One source of truth; the case study stays consistent with the method page |
| Optimistic-like is a tiny self-contained simulation with a rejection toggle | Shows the optimistic+rollback contract precisely without a backend |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Catalog | `src/practices/catalog.ts` | modify | add `news-feed` page |
| Method content | `src/handbook/system-design/content.tsx` | modify | link to the case study from the "Next" block |
| Page route | `src/app/(playground)/system-design/news-feed/page.tsx` | new | `TopicFrame` + `NewsFeedHandbook` |
| Content | `src/handbook/system-design/news-feed.tsx` | new | intro, TOC, four `Topic`s, read-more |
| Diagram | `src/handbook/system-design/feed-architecture.tsx` | new | inline theme-aware SVG + legend |
| Pagination logic | `src/handbook/system-design/pagination.ts` | new | offset/cursor paging over a growing list |
| Pagination demo | `src/handbook/system-design/pagination-demo.tsx` | new | AC-006 |
| Optimistic demo | `src/handbook/system-design/optimistic-demo.tsx` | new | AC-008 |

## Data Flow

Pure client. The pagination demo holds the current post list, page index /
cursor, and the set of seen ids in `useState`; "new posts arrive" prepends to
the list; paging calls `offsetPage`/`cursorPage` and diffs against seen ids to
mark duplicates/skips. The optimistic demo updates local state immediately and
reverts on a simulated rejection.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | catalog, method link | `catalog.ts`, `system-design/content.tsx` | Planned |
| AC-002 | page route, content | `news-feed/page.tsx`, `news-feed.tsx` | Planned |
| AC-003 | content (from framework data) | `news-feed.tsx`, `framework.ts` | Planned |
| AC-004 | diagram | `feed-architecture.tsx` | Planned |
| AC-005 | content | `news-feed.tsx` | Planned |
| AC-006 | pagination logic + demo | `pagination.ts`, `pagination-demo.tsx` | Planned |
| AC-007 | content (links to practices) | `news-feed.tsx` | Planned |
| AC-008 | optimistic demo | `optimistic-demo.tsx` | Planned |
| AC-009 | content | `news-feed.tsx` | Planned |
| AC-010 | content read-more | `news-feed.tsx` | Planned |

## Test Strategy

| Aspect | Detail |
|--------|--------|
| Gate | `pnpm typecheck && pnpm lint && pnpm build` |
| Logic | scratchpad: `offsetPage` duplicates/skips after a head insert; `cursorPage` stable |
| Browser | Puppeteer MCP: page listed (2/2); offset shows a duplicate/skip, cursor stable; optimistic like reverts to exact count with rejection on; deep-dive links resolve; axe light+dark; 360 px; keyboard |

## Considerations

### Error Handling

- Pure client; default states so no panel is empty; simulated rejection is explicit and reversible.
- Figures labelled "example" with a named alternative (AC-004, AC-006).

### Security

- No server, no untrusted input beyond fixed controls; nothing to validate.

## Open Questions

- [ ] None.

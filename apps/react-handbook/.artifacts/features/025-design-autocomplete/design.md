---
id: "025"
feature: design-autocomplete
created: 2026-10-12
---

# Technical Design: Design an autocomplete

## Scope

In scope: a third System Design topic page `autocomplete`
(`/system-design/autocomplete`) with three topics, a theme-aware inline SVG
architecture diagram, a request-lifecycle simulation (debounce + stale-response
guard over a local corpus), and an accessible combobox demo; a link from the
method page. No server code, no new dependency.

Out of scope: see spec.

## Research Summary

Knowledge chain: codebase (debounced-search practice, method dataset) → WAI-ARIA
Authoring Practices combobox pattern → MDN. The race (out-of-order responses) and
debounce behaviour are deterministic client logic with simulated latency; no
server needed.

- debounced-search practice (`src/practices/debounced-search/`) already implements
  debounce + run-id stale guard + query-keyed cache; link it, don't rebuild it.
- Combobox pattern: `role="combobox"` input with `aria-expanded`,
  `aria-controls`, `aria-activedescendant` pointing at the active option's id in a
  `role="listbox"`; options `role="option"` with `aria-selected`. Arrow keys move
  the active option, Enter selects, Escape closes. Known gotcha (knowledge
  feature:011): real `focus()`/`:focus-visible` differ under automation — verify
  keyboard via dispatched keydowns and `aria-activedescendant`.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Reference |
|---------|-------------|-----------|
| Topic page | catalog entry + route + `src/handbook/{slug}/content.tsx` with `Topic`/`Toc` | `src/app/(playground)/system-design/news-feed/page.tsx` |
| Pickers / toggles / verdict | `Choice`, `Toggle`, `Verdict` | jwt/token-view, handbook/ui |
| Theme-aware SVG | Tailwind `fill-card stroke-border fill-foreground` on SVG nodes | `src/handbook/system-design/feed-architecture.tsx` |
| Contrast-safe tinted text | darken token in light: `text-[color-mix(in_oklch,var(--x),black_25-35%)] dark:text-x` | knowledge feature:023/024 |
| Latest-request guard | run-id: only the newest request may update state | `src/practices/debounced-search/search-engine.ts`; knowledge feature:013 |
| Handlers | named `handleX`; one-line inline only | `.claude/rules/05-event-handlers.md` |

### Existing Code to Reuse

| Component | Location | How |
|-----------|----------|-----|
| `Topic`, `Toc` | `src/handbook/topic.tsx`, `toc.tsx` | the three topics |
| `TopicFrame`, `SectionIndex` | `src/components/playground/*` | header + section (handle `system-design`) |
| `Choice`, `Toggle`, `Verdict` | jwt/token-view, handbook/ui | demo controls |
| autocomplete data | `src/handbook/system-design/framework.ts` `PRODUCTS[autocomplete]` | requirements (consistency with method page) |
| `practiceHref`, `topicHref` | `src/practices/catalog.ts` | link to debounced-search and back to the method |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| TopicPageMeta (catalog) | add `autocomplete` page |
| CORPUS (client) | a local word list the demos search |
| Request (client sim) | one simulated suggestion request with a latency |
| Option (combobox) | a suggestion with an id, label and match range |

#### Catalog — `src/practices/catalog.ts`

- `topicPages[]`: append `{ section: "system-design", slug: "autocomplete", title: "Design an autocomplete", summary, written: true }`. The section already active; sidebar/section/progress pick it up.

#### Lifecycle sim (client, `search-sim.ts`, no `server-only`)

- `CORPUS: string[]` (~40 terms).
- `search(query): string[]` — normalised substring match, top N.
- `latencyFor(query): number` — deterministic per query (e.g. from length/hash) so a replayed burst reliably produces an out-of-order arrival; manual typing adds jitter.
- `normalize(q): string` — trim + lowercase (the cache/match key).
- The demo component holds: input, debounce/guard toggles, a monotonic request id, the displayed `{ query, results }`, a request log `{ id, query, latency, status: "applied" | "dropped" | "cache" }`, and a `Map<string, string[]>` cache.

#### Combobox (client, in `combobox-demo.tsx`)

- Options derived from `search(query)`; each with a stable id; active index in state; `aria-activedescendant` = active option id; match highlighting by splitting the label on the normalised query.

### API Contracts

None (no server).

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Exposed? | Gap |
|-------|-------|--------------------|----------|-----|
| AC-001 | listed, 3/3, method link | `catalog.ts`; `src/handbook/system-design/content.tsx` | partial | add row (+ method already lists case studies generically) |
| AC-002 | breadcrumbs/title/intro | `topic-frame.tsx` | yes | none |
| AC-003..011 | case-study content | none | no | new |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Three topics: requirements+architecture, request lifecycle, deep dives (a11y + ranking) | Mirrors the method applied to autocomplete; the lifecycle and the combobox are the two hard parts |
| Lifecycle shown as a simulation over a local corpus, labelled | The race and debounce are deterministic logic; a simulation with controllable latency is the clearest honest way, no server |
| A "replay a fast burst" button alongside the manual input | Makes the out-of-order race reproducible on demand (manual typing is timing-dependent) |
| Reuse the run-id guard concept from debounced-search rather than that module directly | The demo needs to *toggle* the guard off to show the bug; a small local sim keeps both paths visible; the practice is linked as the real implementation |
| Combobox demo hand-built to the WAI-ARIA pattern (not shadcn) | The lesson is the pattern itself; consistent with the repo's "practice the hard part" rule |
| Requirements pulled from `framework.ts` `PRODUCTS[autocomplete]` | One source of truth; consistent with the method page |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Catalog | `src/practices/catalog.ts` | modify | add `autocomplete` page |
| Method content | `src/handbook/system-design/content.tsx` | modify | mention autocomplete as a case study (already links news-feed; keep generic list) |
| Page route | `src/app/(playground)/system-design/autocomplete/page.tsx` | new | `TopicFrame` + `AutocompleteHandbook` |
| Content | `src/handbook/system-design/autocomplete.tsx` | new | intro, TOC, three `Topic`s, read-more |
| Diagram | `src/handbook/system-design/autocomplete-architecture.tsx` | new | inline theme-aware SVG + legend |
| Sim logic | `src/handbook/system-design/search-sim.ts` | new | CORPUS, search, latency, normalize |
| Lifecycle demo | `src/handbook/system-design/lifecycle-demo.tsx` | new | AC-006, AC-007 |
| Combobox demo | `src/handbook/system-design/combobox-demo.tsx` | new | AC-008, AC-009 |

## Data Flow

Pure client. Lifecycle demo: input change → (optional debounce) → check cache
(hit → apply, log "cache", no request) or issue a simulated request with id and
latency → on resolve, if guard on and id !== latest → log "dropped", else apply
and log "applied". Combobox demo: query → `search()` → options with ids; keyboard
moves active index; `aria-activedescendant` tracks it; Enter commits.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | catalog, method link | `catalog.ts`, `system-design/content.tsx` | Planned |
| AC-002 | page route, content | `autocomplete/page.tsx`, `autocomplete.tsx` | Planned |
| AC-003 | content (framework data) | `autocomplete.tsx`, `framework.ts` | Planned |
| AC-004 | diagram | `autocomplete-architecture.tsx` | Planned |
| AC-005 | content | `autocomplete.tsx` | Planned |
| AC-006 | sim + lifecycle demo | `search-sim.ts`, `lifecycle-demo.tsx` | Planned |
| AC-007 | lifecycle demo | `lifecycle-demo.tsx` | Planned |
| AC-008 | combobox demo | `combobox-demo.tsx` | Planned |
| AC-009 | combobox demo | `combobox-demo.tsx` | Planned |
| AC-010 | content (links practice) | `autocomplete.tsx` | Planned |
| AC-011 | content read-more | `autocomplete.tsx` | Planned |

## Test Strategy

| Aspect | Detail |
|--------|--------|
| Gate | `pnpm typecheck && pnpm lint && pnpm build` |
| Logic | scratchpad: a crafted burst produces an out-of-order arrival; guard off → stale wins, guard on → latest wins; debounce reduces request count; cache hit → no request |
| Browser | Puppeteer MCP: page listed (3/3); guard off leaves displayed≠current, guard on keeps match; debounce changes request count; combobox arrow/Enter/Escape move active option and select (via dispatched keydowns + aria-activedescendant, per the automation gotcha); axe light+dark; 360 px |

## Considerations

### Error Handling

- Pure client; empty query → no request/no suggestions; no-match → explicit message; dropped responses logged, never thrown.
- Figures labelled "example" with a named alternative (AC-004, AC-010).

### Security

- No server, no untrusted input beyond fixed controls and the search string (used only for local matching); nothing to validate at a trust boundary.

## Open Questions

- [ ] None.

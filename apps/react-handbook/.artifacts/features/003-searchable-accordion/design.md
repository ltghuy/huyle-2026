---
id: "003"
feature: searchable-accordion
created: 2026-10-06
---

# Technical Design: Searchable Accordion

## Scope

**In scope:** a mock FAQ endpoint (normal ~40 / large ~400 entries, latency
and failure injection), accent-insensitive all-words matching with
original-text highlight ranges, range merging, snippets, the accordion UI
(categories, sections, height animation, ARIA wiring, keyboard model),
open-state management across filtering and modes, Expand/Collapse all, the
demo controls and the explanation.

**Out of scope:** URL sync, auto-expand, server search/debounce/cache
(practice 12), fuzzy matching, nested accordions, automated tests.

## Research Summary

> Sources: WAI-ARIA APG Accordion pattern, ECMAScript `String.prototype.normalize`, React 19 `inert` support, vercel-react-best-practices, ui-ux-pro-max.

- **APG accordion:** each header is a `button` inside a heading element, with `aria-expanded` and `aria-controls`; the panel is labelled by its button. Up/Down/Home/End between headers are optional extras (in scope). APG warns against `role="region"` when more than ~6 panels can be open at once (landmark proliferation), so panels get `aria-labelledby` without the region role. AC-006 was updated to match.
- **Accent folding:** `normalize("NFD")` splits "é" into "e" + a combining mark, and `/\p{M}/gu` removes marks. Folding **character by character** gives a folded string plus an index map from folded positions back to original positions, so highlights land on the original text ("Café" keeps its é). Lowercasing can change length (e.g. "İ" → "i̇"); per-character folding absorbs that because the map is built per original character.
- **Literal matching:** `indexOf` on folded strings, never `RegExp` built from user input, so special characters are literal by construction (AC-018) and there's no regex injection.
- **Hiding collapsed panels:** the `inert` attribute (supported by React 19 as a boolean prop) removes content from the tab order and the accessibility tree while it stays in the DOM for the height animation (AC-007).
- **vercel-react-best-practices:** `useDeferredValue` for the query (`rerender-use-deferred-value`) keeps typing responsive while 400 sections re-render; `content-visibility: auto` on sections (`rendering-content-visibility`) skips layout and paint for off-screen ones; the search index is precomputed once per load (`js-cache-function-results`), not per keystroke.
- **ui-ux-pro-max:** "No results" offers a next step (hint + Clear); visible focus on headers; motion 150–250 ms; respect reduced motion. Its deep-linking rule conflicts with the "no URL sync" decision; the decision stands.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Practice registration | Own route file + `built: true` | Touching `[slug]` | src/app/(playground)/practices/toast-notifications/page.tsx:1 |
| Demo composition | `DemoControls` → `DemoStage` | Unbounded errors | src/practices/toast-notifications/demo.tsx |
| API handlers | Thin route → Zod → `server-only` service; `{ error: { message } }` | Logic in route files | src/app/api/practices/toast-notifications/save/route.ts:5 |
| JSX handlers | Named `handleX` unless a one-line call | Multi-line inline handlers | .claude/rules/05-event-handlers.md |
| Exit/collapse motion | `grid-template-rows` 1fr ↔ 0fr track | Measuring heights in JS | src/practices/toast-notifications/toast-item.tsx:61 |
| Theme colors | Tokens (`bg-warning/25`, `text-muted-foreground`) | Raw colors | src/app/globals.css |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| Button, Input, Card | src/components/ui/* | Toolbar, search box, controls |
| Skeleton | src/components/ui/skeleton.tsx | Loading placeholder |
| `DemoControls`, `DemoStage` | src/components/playground/* | Practice layout |
| `parseBody`/`jsonError` pattern, Zod | src/lib/http.ts | Endpoint validation (query params here) |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| FaqEntry | One question/answer with its category |
| IndexedEntry | FaqEntry + folded question/answer + index maps (built once per load) |
| Match | Per-entry search result: highlight ranges for question and answer, body-only flag, snippet |
| AccordionState | Open section ids (ordered by open time) + mode |

All new; no existing types are touched.

#### FaqEntry (new: `src/server/practices/searchable-accordion/faq.schema.ts`, shared type)

- `id` (string, stable across reloads), `category` (string), `question` (string), `answer` (string)

#### IndexedEntry (new: `src/practices/searchable-accordion/search.ts`)

- `entry` (FaqEntry)
- `question`, `answer` (FoldedText): `{ folded: string; map: number[] }`, where `map[i]` = original index of folded char `i`, plus a sentinel `map[folded.length]` = original length

#### Match

- `questionRanges`, `answerRanges` ([start, end][] in original indices, merged)
- `bodyOnly` (boolean): matched words occur only in the answer
- `snippet?` ({ text: string; ranges: [start, end][]; leadingEllipsis: boolean; trailingEllipsis: boolean })

#### AccordionState (reducer)

- `open` (string[]: ids, most recently opened last)
- `mode` ("single" | "multiple")
- Actions: `toggle(id)`, `setMode(mode)`, `expand(ids)`, `collapse(ids)`

### API Contracts

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/practices/searchable-accordion/faq` | GET | query `size=normal\|large`, `latencyMs=0–10000`, `failRate=0–1` | `200 { data: FaqEntry[] }`; `500 { error: { message: "Simulated server failure" } }`; `422` invalid params |

### Currently Exposed Fields

No AC enumerates fields from existing code.

## Decisions

| Decision | Rationale |
|----------|-----------|
| Precompute `IndexedEntry[]` once per load (`useMemo` on the data) | Folding 400 entries per keystroke is wasted work |
| Query → words: fold, split on whitespace, drop empties, dedupe, cap the query at 100 chars | AC-008–010, edge case |
| An entry matches when **every** word occurs in folded question **or** answer (`indexOf`) | AC-008; literal matching (AC-018) |
| Ranges: collect every occurrence of every word in each text, map to original indices, sort, merge when overlapping **or touching** | AC-015, AC-017 |
| `bodyOnly` = no word found in the question at all, and at least one found in the answer | AC-016 |
| Snippet: ~40 chars either side of the first answer match, widened to word boundaries; ellipsis only when cut | AC-016, edge case |
| `<Highlight text ranges>` splits text into string and `<mark>` children; never `dangerouslySetInnerHTML` | AC-019; React escapes text |
| Open state in a reducer: `open` ordered by open time; filtering never edits it | Open sections survive filtering (AC-014); switching to single keeps the last opened (AC-024); in single mode, opening clears all others including hidden ones (edge case) |
| Expand/Collapse all receive the **visible** ids | AC-027; disabled states derived during render (AC-028) |
| Header: `<h3><button aria-expanded aria-controls id>` inside each category's `<section>` with an `<h2>` | APG structure; heading levels for AC-031 |
| Panel: `<div id aria-labelledby inert={!open}>` inside a `grid-rows-[0fr]/[1fr]` track, 200 ms ease-out; indicator chevron rotates | AC-005–007; same technique as the toasts |
| Keyboard: one `onKeyDown` on the accordion root; Up/Down/Home/End move between visible `[data-accordion-trigger]` buttons with wrap-around; Down in the search box focuses the first trigger; Escape in the search box clears it | AC-013, AC-020–022; one delegated handler instead of one per section |
| `useDeferredValue(query)` for filtering/highlighting; the input stays bound to the immediate value | Typing never waits for 400 sections to render (success criterion) |
| `content-visibility: auto` + `contain-intrinsic-size` on each section | Skips rendering work for off-screen sections in the large set |
| Section component memoized on `entry.id`, `open`, and a match signature (ranges serialized) | Unchanged sections skip re-render between keystrokes |
| Count announcement: polite live region updated 500 ms after the last change in the deferred query | AC-011: announce "after typing pauses", not per keystroke |
| Data loading: `useEffect` fetch with `AbortController`, keyed by a `reloadKey` and the size; "loading" is set in the Reload/size handlers (not synchronously in the effect) | Abort stale requests; satisfies the React Compiler lint rule |
| The query and open state live above the data, so a reload keeps them; open ids that no longer exist are ignored at render | Edge cases: query kept during load and reload |
| Mock data: ~40 hand-written entries in 6 categories, including accented words (Café, résumé, Zürich, naïve), markup-like text (`<b>`), and special characters (C++, `(beta)`, `1.5`, `[x]`); large = 10 variations with ids `{id}-{n}` | Realistic matches and built-in test cases for AC-009/018/019 |
| Mode toggle as two buttons with `aria-pressed` | Accessible segmented control without a new component |
| Highlight color: `bg-warning/30 text-foreground` with a 2 px radius | Visible in both themes; token-based |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| FAQ schema + type | src/server/practices/searchable-accordion/faq.schema.ts | new | Zod query schema, `FaqEntry` type |
| FAQ data | src/server/practices/searchable-accordion/faq.data.ts | new | ~40 entries |
| FAQ service | src/server/practices/searchable-accordion/faq.service.ts | new (`server-only`) | Size expansion, latency, failure |
| FAQ route | src/app/api/practices/searchable-accordion/faq/route.ts | new | Thin GET handler |
| Search engine | src/practices/searchable-accordion/search.ts | new | `foldText`, `indexEntries`, `parseQuery`, `matchEntry`, `mergeRanges`, `makeSnippet` |
| Accordion reducer | src/practices/searchable-accordion/accordion-state.ts | new | State, actions, reducer |
| Highlight | src/practices/searchable-accordion/highlight.tsx | new | Text + `<mark>` segments |
| AccordionSection | src/practices/searchable-accordion/accordion-section.tsx | new (client) | Header button, badge + snippet, animated panel |
| FaqAccordion | src/practices/searchable-accordion/faq-accordion.tsx | new (client) | Search box, count, toolbar, categories, keyboard, empty/no-results states |
| Demo | src/practices/searchable-accordion/demo.tsx | new (client) | Controls (mode, latency, failure, size, Reload), loading/error, renders FaqAccordion |
| Explanation | src/practices/searchable-accordion/explanation.tsx | new (server) | Notes per spec |
| Route | src/app/(playground)/practices/searchable-accordion/page.tsx | new | PracticeFrame |
| Catalog | src/practices/catalog.ts | modify | `built: true` |

## Data Flow

```mermaid
flowchart LR
  API[/GET faq/] -->|FaqEntry[]| Demo
  Demo -->|entries, mode| Acc[FaqAccordion]
  Acc -->|useMemo once| Index[IndexedEntry[]]
  Input[search input] -->|query| Def[useDeferredValue]
  Def -->|parseQuery| Words
  Index --> Match{matchEntry per entry}
  Words --> Match
  Match -->|visible + ranges| Groups[group by category]
  Groups --> Sections[AccordionSection x N]
  Reducer[(open ids, mode)] --> Sections
  Sections -->|toggle| Reducer
```

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | Demo loading + Skeleton | demo.tsx | Planned |
| AC-002 | Demo error + Retry | demo.tsx | Planned |
| AC-003 | FaqAccordion groups, collapsed default | faq-accordion.tsx | Planned |
| AC-004 | AccordionSection button | accordion-section.tsx | Planned |
| AC-005 | grid-rows track + chevron + motion-reduce | accordion-section.tsx | Planned |
| AC-006 | button aria-expanded/controls; panel aria-labelledby, no region role | accordion-section.tsx | Planned |
| AC-007 | `inert` on collapsed panel | accordion-section.tsx | Planned |
| AC-008 | matchEntry all-words | search.ts | Planned |
| AC-009 | foldText | search.ts | Planned |
| AC-010 | parseQuery empty → match all | search.ts | Planned |
| AC-011 | count + delayed live region | faq-accordion.tsx | Planned |
| AC-012 | no-results state + focus | faq-accordion.tsx | Planned |
| AC-013 | Escape clears | faq-accordion.tsx | Planned |
| AC-014 | reducer untouched by filtering | accordion-state.ts | Planned |
| AC-015 | ranges + Highlight | search.ts, highlight.tsx | Planned |
| AC-016 | bodyOnly + snippet + badge | search.ts, accordion-section.tsx | Planned |
| AC-017 | mergeRanges (touching) | search.ts | Planned |
| AC-018 | indexOf on folded text | search.ts | Planned |
| AC-019 | text children only | highlight.tsx | Planned |
| AC-020 | Up/Down wrap | faq-accordion.tsx | Planned |
| AC-021 | Home/End | faq-accordion.tsx | Planned |
| AC-022 | Down from search box | faq-accordion.tsx | Planned |
| AC-023 | reducer single toggle | accordion-state.ts | Planned |
| AC-024 | setMode keeps last | accordion-state.ts | Planned |
| AC-025 | reducer multiple | accordion-state.ts | Planned |
| AC-026 | toolbar visibility by mode | faq-accordion.tsx | Planned |
| AC-027 | expand/collapse visible ids | faq-accordion.tsx, accordion-state.ts | Planned |
| AC-028 | derived disabled states | faq-accordion.tsx | Planned |
| AC-029 | category groups + counts | faq-accordion.tsx | Planned |
| AC-030 | hide empty groups | faq-accordion.tsx | Planned |
| AC-031 | h2 categories, h3 questions | faq-accordion.tsx, accordion-section.tsx | Planned |
| AC-032 | Reload with latency/failure | demo.tsx, faq route | Planned |
| AC-033 | size normal/large | demo.tsx, faq.service.ts | Planned |
| AC-034 | mode control | demo.tsx | Planned |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | None (cross-practice decision) |
| Command | `pnpm typecheck && pnpm lint && pnpm build` |
| Location | n/a |

### Reference Tests

None.

### New Tests

No automated tests. Browser verification on a production build: the 10-query table (expected sections and highlights), keyboard walkthrough, per-keystroke main-thread time with the large set (Performance API around input events plus a long-task observer), axe-core with search active, endpoint checks with curl.

## Considerations

### Error Handling

- Endpoint: 422 for invalid query params, 500 for simulated failure, standard error shape.
- Demo: aborts in-flight requests on reload/unmount; ignores aborted results; error state with Retry.
- Content render errors are caught by `DemoStage`.

### Security

- No `RegExp` from user input; no HTML injection (text nodes only).
- Query capped at 100 chars; endpoint latency capped at 10 s.

### Performance

- Index built once per load; per keystroke: O(entries × words) `indexOf` calls on short strings.
- Deferred query + memoized sections + `content-visibility` for the 400-entry set.

## Open Questions

- None.

---
id: "003"
feature: searchable-accordion
created: 2026-10-06
---

# Tasks: Searchable Accordion

## Summary

Total: 9 | Completed: 9 | Remaining: 0

## Execution Plan

```
T001 ─────────────────────────────┐
T002 ──> T003 ──┐                 ├──> T007 ──> T008 ──> T009
T004 ───────────┼──> T005 ──> T006┘
                └─────────────────┘
```

- T001 (endpoint), T002 (search engine) and T004 (reducer) are independent.
- T003 (highlight) needs the range model from T002.
- T005/T006 build the UI on top of T002–T004; T007 wires data loading and controls.

## Quality Gates

Run after each task or batch:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build` (end of each group)

## Tasks

### Data

- [x] T001 [P] Build the mock FAQ endpoint: schema (size, latency, failure), ~40 entries in 6 categories with accented, markup-like and special-character test text, large-set expansion (~400, stable ids), service with latency/failure, thin GET route
  - **Done when:** `curl` returns 40 entries for normal and ~400 for large, 500 at failRate 1, 422 for invalid params, and honors latency. -- VERIFIED

### Search engine

- [x] T002 [P] Build `search.ts`: per-character fold with index map, `indexEntries`, `parseQuery` (fold, split, dedupe, 100-char cap), `matchEntry` (all words, question or answer), `mergeRanges` (overlap and touch), `bodyOnly`, `makeSnippet`
  - **Done when:** in a browser console against the built page, "cafe" matches "Café", "refund card" requires both words, "C++" and "(beta)" match literally, "car card" produces one merged range, snippets add ellipses only when cut. -- VERIFIED

- [x] T003 [B:T002] Build `<Highlight>`: text and `<mark>` segments from ranges
  - **Done when:** a `<b>` in content renders as visible text, and highlights show the original accented characters. -- VERIFIED

### State

- [x] T004 [P] Build the accordion reducer: toggle (single/multiple), setMode (keep last opened), expand(ids), collapse(ids)
  - **Done when:** the single/multiple behaviors and the mode switch match AC-023–025 and AC-027 when exercised from the UI in T006. -- VERIFIED

### UI

- [x] T005 [B:T003,T004] Build AccordionSection: h3 + button (aria-expanded, aria-controls), chevron, "match in answer" badge + snippet, `inert` grid-rows panel labelled by its button, 200 ms motion with reduced-motion fallback, memoized
  - **Done when:** clicking, Enter and Space toggle a section with a smooth height change; a collapsed panel can't be tabbed into and isn't in the accessibility tree. -- VERIFIED

- [x] T006 [B:T005] Build FaqAccordion: search box (Escape clears, Down focuses the first question), deferred filtering, count + delayed polite announcement, no-results state with hint + Clear (focus back to the search box), category h2 groups with counts and hiding, Expand/Collapse all (multiple mode, visible only, derived disabled states), Up/Down/Home/End delegation with wrap, `content-visibility` on sections
  - **Done when:** AC-008–AC-031 can be exercised in the browser. -- VERIFIED

### Practice page

- [x] T007 [B:T001,T006] Build the demo: controls (mode toggle with aria-pressed, latency, failure rate, size, Reload), fetch with AbortController keyed by reload/size, loading skeleton, error + Retry, query and open state kept across reloads
  - **Done when:** Reload honors latency and failure; switching size reloads; typing during loading applies once content arrives. -- VERIFIED

- [x] T008 [B:T007] Write the explanation, add the route file and `built: true`
  - **Done when:** `/practices/searchable-accordion` renders through its own route and shows Built (2 of 14). -- VERIFIED

### Verification

- [x] T009 [B:T008] Verify all ACs and measure the success criteria in a production build: 10-query table, keyboard walkthrough, per-keystroke main-thread time on the large set, axe-core with search active
  - **Done when:** results are recorded in tasks.md notes and ACs are marked in spec.md. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T007 |
| AC-002 | T007 |
| AC-003 | T006 |
| AC-004 | T005 |
| AC-005 | T005 |
| AC-006 | T005 |
| AC-007 | T005 |
| AC-008 | T002, T006 |
| AC-009 | T002 |
| AC-010 | T002 |
| AC-011 | T006 |
| AC-012 | T006 |
| AC-013 | T006 |
| AC-014 | T004 |
| AC-015 | T002, T003 |
| AC-016 | T002, T005 |
| AC-017 | T002 |
| AC-018 | T002 |
| AC-019 | T003 |
| AC-020 | T006 |
| AC-021 | T006 |
| AC-022 | T006 |
| AC-023 | T004 |
| AC-024 | T004 |
| AC-025 | T004 |
| AC-026 | T006 |
| AC-027 | T004, T006 |
| AC-028 | T006 |
| AC-029 | T006 |
| AC-030 | T006 |
| AC-031 | T005, T006 |
| AC-032 | T001, T007 |
| AC-033 | T001, T007 |
| AC-034 | T007 |

## Verification Notes (production build, headless Chrome)

### Query table (normal content, 40 sections)

| Query | Result | Highlights |
|-------|--------|------------|
| `cafe` | 1: "Do you deliver to a café or office?" | café |
| `RESUME` | 1: "Can I upload my résumé…" | résumé |
| `refund card` | 3: charged twice (badge), parcel damaged (badge), get a refund | refund, card |
| `card refund` | same 3 (order-independent) | refund, card |
| `c++` | 1: "Which items can't be returned?" (badge) | C++ |
| `(beta)` | 1: Pro plan (beta) | (beta) |
| `1.5` | 1: "The app is slow…" (badge) | 1.5 |
| `[x]` | 1: mark a task as done (badge) | [x] |
| `<b>` | 1: "Why does my name show as <b>Guest</b>?" (rendered as text) | <b> |
| `zurich` | 1: ship to Zürich | Zürich |
| `naive` | 1: “naïve date” errors | naïve |
| `zzz` | 0 → No results + hint + Clear | n/a |

The search engine was also checked directly (Node type stripping): overlap and touch merging, snippet ellipses only when cut, whitespace-only query = all, 100-char cap.

### Behavior

| Check | Result |
|-------|--------|
| ARIA | h3 > button with aria-expanded/aria-controls; panel aria-labelledby, no role; collapsed panel `inert`, height 0 |
| Keyboard | Down from search → first; Up wraps to last; Home/End; Down wraps to first; Escape clears; Clear returns focus to search |
| Open state | Opened section survives being filtered out; Expand all with a filter opened only the 7 visible; switch to single kept the most recently opened; single mode keeps one open |
| Announcements | Count written to the polite region 500 ms after typing pauses (empty immediately after the keystroke) |
| Loading / errors | Skeleton with aria-busy; 100% failure → error + Retry → 40 sections; query typed during load applied after load; open section kept across reload |
| Large content | 400 sections; "refund card" → 30 of 400 |
| Performance (400 sections, 120 Hz display) | Input handler ≤ 2.6 ms; frame gaps while typing p95 9.0 ms, max 9.3 ms; worst case (clear → all 400 re-render) max 9.4 ms; 0 frames over 16 ms; 0 long animation frames over 50 ms |
| axe-core 4.10, search active, open + collapsed | 0 serious, 0 critical; 1 moderate `region` (pre-existing sidebar wrapper) |
| 360 px | No horizontal scroll |

Fix during verification: category heading names read "Account7" → now "Account (7 questions)".

AC-005 (smoothness of the height animation and chevron rotation) needs a human eye: left for UAT. Reduced motion relies on the global reduced-motion rule (code inspection).

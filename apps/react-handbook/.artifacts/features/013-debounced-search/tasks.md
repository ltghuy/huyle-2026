---
id: "013"
feature: debounced-search
created: 2026-10-07
---

# Tasks: Debounced Search + API Cache

## Summary

Total: 8 | Completed: 8 | Remaining: 0

## Execution Plan

```
T001 ──┐
T002 ──┼──> T003 ──> T004 ──┬──> T005 ──┐
       │                    └──> T006 ──┼──> T008
       └───────────────────────> T007 ──┘
```

## Quality Gates

Run after each task or batch:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

## Tasks

### Foundations

- [x] T001 [P] Search schema, catalog data, service and route (AC-004 server side, AC-005, AC-020, AC-021 server side)
  - **Done when:** `GET /api/practices/debounced-search/search?q=Desk%20Lamp` returns 20 items + total; `q=café` matches "Café Mug"; latency follows base + jitter and `shorter-slower`; `failRate=1` → 500; bad params → 422; an aborted request stops the delay. -- VERIFIED

- [x] T002 [P] Search cache (AC-009–011, AC-013)
  - **Done when:** script check with an injected clock: fresh/stale/expired states, LRU eviction at the limit, `get` touches recency and counts hits, `configure` re-applies the limit, subscribers notified. -- VERIFIED

### Engine

- [x] T003 [B:T001,T002] Search API client + search engine + typing robot (AC-001–004, AC-006, AC-007, AC-009–011, AC-014–017, AC-019, AC-021)
  - **Done when:** script check with a fake fetcher: "desk lamp" typed every 50 ms → 1 request and 6 debounced; debounce off → 7 requests; same-key skip; too short clears and aborts; dedupe of an in-flight key; abort marks entries; guard over 200 random sequences → shown key = last run key; guard + abort off → mismatch reproducible; cache hit / SWR refresh / errors not cached; dropped responses cached. -- VERIFIED

### UI

- [x] T004 [B:T003] Hooks, highlight and combobox search box (AC-001–005, AC-008, AC-017, AC-021–025)
  - **Done when:** in the browser: typing shows waiting bar, then results with highlights; Enter searches now; idle/skeleton/updating/empty/error/mismatch states render; ArrowUp/Down/Enter/Escape work; status region announces only settled results; URL `?q=` updates and a `?q=` load runs immediately. -- VERIFIED

- [x] T005 [P] [B:T004] Request timeline with counters (AC-014, AC-015)
  - **Done when:** rows for debounced, cache hit, refresh, shown, aborted, stale, failed appear with text + icon and bars on a shared axis; counters match the rows; Clear resets both. -- VERIFIED

- [x] T006 [P] [B:T004] Cache inspector (AC-012, AC-013)
  - **Done when:** entries listed most recent first with count, age (ticking), fresh/stale, hits; Clear cache empties it; entries survive navigating away and back. -- VERIFIED

- [x] T007 [B:T003] Technique panel, presets, robot controls, demo controls (AC-016, AC-018–020)
  - **Done when:** each switch changes the next search's behavior; presets flip all four; robot types and stops on manual input or Stop; server latency/jitter/mode/failure, debounce delay, min length, cache fresh time and size apply to the next search. -- VERIFIED

### Wrap-up

- [x] T008 [B:T005,T006,T007] Demo layout, page route, catalog `built: true`, explanation guide, knowledge entries; full verification
  - **Done when:** every AC and success criterion verified in the browser (both themes, 360 px, axe); quality gates pass. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T003, T004 |
| AC-002 | T003, T004 |
| AC-003 | T003, T004 |
| AC-004 | T001, T003, T004 |
| AC-005 | T001, T004 |
| AC-006 | T003 |
| AC-007 | T003 |
| AC-008 | T004 |
| AC-009 | T002, T003 |
| AC-010 | T002, T003 |
| AC-011 | T002, T003 |
| AC-012 | T006 |
| AC-013 | T002, T006 |
| AC-014 | T003, T005 |
| AC-015 | T003, T005 |
| AC-016 | T003, T007 |
| AC-017 | T003, T004 |
| AC-018 | T007 |
| AC-019 | T003, T007 |
| AC-020 | T001, T007 |
| AC-021 | T001, T003, T004 |
| AC-022 | T004 |
| AC-023 | T004 |
| AC-024 | T004 |
| AC-025 | T004, T008 |

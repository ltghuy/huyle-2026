---
id: "004"
feature: infinite-scroll
created: 2026-10-06
---

# Tasks: Infinite Scroll

## Summary

Total: 8 | Completed: 8 | Remaining: 0

## Execution Plan

```
T001 ──> T002 ──┐
T003 ───────────┼──> T004 ──> T005 ──> T006 ──> T007 ──> T008
```

- T001 (server store + schema) unblocks the routes (T002).
- T003 (client API + cache) is independent of the server code.

## Quality Gates

Run after each task or batch:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build` (end of each group)

## Tasks

### Backend

- [x] T001 [P] Build the feed schema (query schemas, types, cursor encode/decode) and the in-memory store (500 deterministic posts, page by cursor, newer (oldest 100 + count), simulate 3, 2,000-post cap)
  - **Done when:** the store pages all 500 posts newest-first with no duplicates, and posts added by simulate don't change older pages. -- VERIFIED

- [x] T002 [B:T001] Add the three routes: GET feed, GET feed/newer, POST feed/simulate
  - **Done when:** `curl` shows pages with `nextCursor` until `null`, honors latency/failure, `newer` returns the count + posts after simulate, 422 for bad cursors/params. -- VERIFIED

### Client data layer

- [x] T003 [P] Build the feed API client and the module-level feed cache
  - **Done when:** typed `fetchPage`/`fetchNewer`/`simulatePosts` surface server error messages; the cache gets/sets/clears a snapshot. -- VERIFIED

- [x] T004 [B:T002,T003] Build `useFeed`: state machine, single-flight ref, abort, retry with the same cursor, polling with hidden-tab skip and pending dedupe, pill insert, reset, cache sync, request options read from a ref at request time
  - **Done when:** wired to a temporary view, the hook loads pages one at a time, ends at ~500, retries correctly, and collects pending posts. -- VERIFIED

### Feed UI

- [x] T005 [B:T004] Build PostCard and FeedView: scroll box (overscroll contain), skeleton, sentinel observer re-created on idle, loading/error/end/Load more rows, first-page error, feed pattern + Page Up/Down, live region, new-posts pill, Back to top, anchor save (passive rAF listener) and restore (layout effect)
  - **Done when:** scrolling loads pages automatically, the box fills itself, the pill inserts and scrolls to top, Back to top appears after two box heights, and leaving and returning restores position. -- VERIFIED

### Practice page

- [x] T006 [B:T005] Build the demo: controls (latency, failure rate, page size, trigger distance, check interval, Simulate new posts, Reset feed) and the stats line; write the explanation; add the route and `built: true`
  - **Done when:** `/practices/infinite-scroll` renders through its own route and shows Built (3 of 14); every control affects the next request or check. -- VERIFIED

### Verification

- [x] T007 [B:T006] Verify all ACs in a production build
  - **Done when:** each AC has observed evidence, recorded in tasks.md notes and marked in spec.md. -- VERIFIED

- [x] T008 [B:T007] Measure the success criteria: full-feed scroll (requests = pages, unique ids, order) with new posts mid-scroll, append stability (first visible post within 1 px) + long tasks, restoration accuracy with zero requests, axe-core
  - **Done when:** measurements are recorded, ready for audit. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T005 |
| AC-002 | T004, T005 |
| AC-003 | T004 |
| AC-004 | T004 |
| AC-005 | T005 |
| AC-006 | T001, T004, T005 |
| AC-007 | T004 |
| AC-008 | T005 |
| AC-009 | T004, T005 |
| AC-010 | T004 |
| AC-011 | T005 |
| AC-012 | T005 |
| AC-013 | T005 |
| AC-014 | T005 |
| AC-015 | T005 |
| AC-016 | T005 |
| AC-017 | T003, T005 |
| AC-018 | T004 |
| AC-019 | T003 |
| AC-020 | T004 |
| AC-021 | T004, T005 |
| AC-022 | T004, T005 |
| AC-023 | T002, T006 |
| AC-024 | T001 |
| AC-025 | T005 |
| AC-026 | T004, T006 |
| AC-027 | T004, T006 |
| AC-028 | T006 |

## Verification Notes (production build, headless Chrome)

| Check | Result |
|-------|--------|
| Server paging (curl) | 500 posts in 24 pages, 3 posts simulated after page 3 and page size changed mid-way: 500 unique, strictly descending #500 → #1; `newer` returned the 3 new posts; latency honored; 500/422 cases |
| Full browser scroll (20/page) | 25 requests (stats line = network resource entries = 25 pages); 500 unique posts in order; 3 posts simulated at 200 loaded; end row "You've reached the end · 500 posts"; aria-busy seen during loads |
| Append stability | First visible post moved 0 px across every append; 0 long tasks over 50 ms |
| Feed markup | `role=feed` "Posts"; articles focusable with `aria-posinset`/`aria-setsize` (500) and labelled by author |
| Announcements | "Loaded 20 more posts, 20 total.", "Couldn't load more posts.", "End of feed, 500 posts.", "6 new posts shown." |
| Fill | Page size 10: two pages auto-loaded until the box could scroll |
| Load more | One click → one request, +10 posts |
| Mid-list error | Posts kept, error row + Retry, auto-loading paused (re-scrolling made no request); Retry continued from #477 → #476 contiguously |
| First-page error | Full error view with Retry; Retry loaded the first page |
| New posts | Pill "6 new posts" with no insertion and no position change; click inserted #506–#501 at top, scrolled to top, announced; 506 unique; 0 checks while the tab was hidden, resumed after |
| Back to top | Visible after two box heights; scrolled to 0 and focused the first post |
| Page Down / Up | Moves focus post to post |
| Restoration | Away to another practice and Back: same anchor post (#414), same offset (−65 px), scrollTop 6000 → 6000, 0 page requests |
| Leaving mid-request | Request dropped; on return the feed was idle with Load more, no stuck loading state |
| Full reload | Fresh feed |
| axe-core 4.10, posts loaded | 0 serious, 0 critical; 1 moderate `region` (pre-existing sidebar wrapper) |
| 360 px | No horizontal scroll; feed scrolling didn't scroll the page |

Verified by code inspection only: "99+" label cap, trigger distances 0 and 1200 px (observer `rootMargin`), no focus movement on page load (no focus calls in the load path), reduced-motion instant scroll.

Test-harness note: `PracticeFrame` is itself an `<article>`; tests must select posts with `article[data-post-id]`.

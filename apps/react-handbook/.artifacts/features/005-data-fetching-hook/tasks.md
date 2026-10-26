---
id: "005"
feature: data-fetching-hook
created: 2026-10-07
---

# Tasks: Custom Data-Fetching Hook with Caching

## Summary

Total: 9 | Completed: 9 | Remaining: 0

## Execution Plan

```
T001 ─────────────────────────────┐
T002 ──> T003 ──> T004 ──> T005 ──┼──> T006 ──> T007 ──> T008 ──> T009
```

- T001 (mock API) is independent of the client core (T002–T005).

## Quality Gates

Run after each task or batch:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build` (end of each group)

## Tasks

### Mock API

- [x] T001 [P] Build the users schema, in-memory store (20 users, `u-13` detail 404) and routes (GET list, GET/PATCH one) with fixed/random latency and failure injection
  - **Done when:** `curl` shows the list, a detail, a validated PATCH, 404 for `u-13`, 422 for a bad body, random latency in range, and 500 at failRate 1. -- VERIFIED

### Query core

- [x] T002 [P] Build `hashKey` (recursive sorted keys)
  - **Done when:** `["user", {a:1,b:2}]` and `["user", {b:2,a:1}]` hash the same; arrays keep order. -- VERIFIED

- [x] T003 [B:T002] Build the query client: entries, immutable states, listeners (per key + any), fetch with tokens/abort/dedupe/cancelRefetch, retry with backoff (404 not retried), offline pause, stale logic, observers with delayed cancel + gc, focus/online refresh with throttle, prefetch, set/get/cancel/invalidate/refetch/clear, defaults
  - **Done when:** exercised through the demo in T007–T009 (no isolated test harness). -- VERIFIED

- [x] T004 [B:T003] Build `useQuery` on `useSyncExternalStore` (subscribe registers the observer; key/fetcher refs via layout effect)
  - **Done when:** a component shows loading → data, re-renders only for its key, and resubscribes on key change. -- VERIFIED

- [x] T005 [B:T003] Build `useOptimisticPatch` (cancel, apply to list + detail, field-level revert, toast, invalidate, pending fields)
  - **Done when:** a forced failure restores the previous values and a success ends on server values. -- VERIFIED

### Demo

- [x] T006 [B:T001,T004,T005] Build users API client (fetchers, HttpError, network settings, keys), UsersList (selection, prefetch, favorite toggle), UserDetail (badges, rename, 404), CacheInspector (live table + actions)
  - **Done when:** the master-detail works against the mock API and the inspector updates live. -- VERIFIED

- [x] T007 [B:T006] Build the demo controls (latency fixed/random, failure, stale time, removal time, retries, focus refresh, second panel) and the explanation; add the route and `built: true`
  - **Done when:** `/practices/data-fetching-hook` renders through its own route and shows Built (5 of 14). -- VERIFIED

### Verification

- [x] T008 [B:T007] Verify all ACs in a production build
  - **Done when:** each AC has observed evidence, recorded in tasks.md notes and marked in spec.md. -- VERIFIED

- [x] T009 [B:T008] Measure the success criteria: 3-panel dedupe, same-frame cached render, 20 rapid-switch runs, 10 optimistic failure runs, axe-core in both themes
  - **Done when:** measurements are recorded, ready for audit. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001–AC-016 | T002, T003, T004, T008 |
| AC-017 | T006 |
| AC-018 | T006 |
| AC-019 | T003, T006 |
| AC-020–AC-027 | T003, T006, T008 |
| AC-028–AC-033 | T005, T006 |
| AC-034 | T003, T006, T007 |
| AC-035 | T007 |
| AC-036–AC-037 | T003, T004 |

## Verification Notes (production build, headless Chrome)

| Check | Result |
|-------|--------|
| Endpoints (curl) | list 20; detail; 404 for u-13; PATCH trims and validates (422 on `{}`); 500 at failRate 1; random latency 1.1–1.8 s |
| Key hashing (direct run) | reordered object properties hash equal; arrays keep order |
| Dedupe | 3 detail panels on u-2 → 1 network request; inspector: 3 users, 1 request |
| Same-frame cached render | 3/3 switches to a cached user: name correct before the next paint (~9 ms), loading state never rendered |
| Stale-while-revalidate | revisiting a cached user (stale time 0) → one background request, "Refreshing" badge |
| Race (SC) | 20/20 runs: 10 users clicked within ~1.5 s under random latency, cache cleared each run; detail ended on the last-clicked user and no other user appeared after the last click |
| Optimistic failures (SC) | 10/10: new name in list + detail within one frame with "Saving…" + disabled button; after failure both restored exactly; error toast (merged ×10) |
| Overlapping edits | failing rename + succeeding favorite toggle: name reverted, favorite kept |
| In-flight refresh vs edit | refresh started, then rename: only the new name ever rendered; list and detail ended on server values; follow-up refresh made |
| Retries | 100% failure: tries 1→4 (4 requests), loading until final failure (~6.6 s ≈ 1+2+4 s ± jitter), then error + Retry; manual Retry loaded fresh |
| 404 | "User not found", 1 request (no retries) |
| Offline | request `paused` while offline; completed after `online` |
| Focus | 5 focus events within 0.5 s → each stale key in use refreshed once; off → no refresh |
| Stale time Never | revisit made no request; entry "fresh" |
| GC | unused entry counted down from 10 s and was removed; re-use cancelled the countdown |
| Prefetch | 150 ms hover prefetched with 0 users and a removal countdown; opening it rendered without loading; keyboard focus prefetched |
| Failed background refresh | data kept, "Refresh failed … Showing cached data." banner |
| Clear cache in use | mounted keys reloaded (requests reset to 1) |
| Navigation | back from another practice: list rendered from cache immediately, 1 background refresh |
| axe-core 4.10, 2 panels, light + dark | 0 serious, 0 critical; 1 moderate `region` (pre-existing) |

Verified by code inspection only: no updates after unmount (listeners removed in the store's unsubscribe), synchronously throwing fetchers (wrapped in a promise), shortened removal time applies to new waits.

Known limitation: a focus refresh that starts while an optimistic edit is still saving could briefly show the server's old value before the edit's own follow-up refresh; the edit cancels refreshes only when it starts.

Test-harness notes: each list row has two buttons (select + favorite), so select rows with `li > button:first-child`; React applies click updates in a microtask, so read the DOM after `await` and wait before polling after actions that reset UI.

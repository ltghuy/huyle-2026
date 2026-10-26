---
id: "005"
feature: data-fetching-hook
type: greenfield
scope: complex
status: done
branch: main
created: 2026-10-06
---

# Feature: Custom Data-Fetching Hook with Caching

## Overview

Practice 4 of the playground. The learner wants to build, from scratch, the
kind of data layer that libraries like SWR and TanStack Query provide: a
hook that fetches data by key, shares one cache across every component that
asks for the same thing, shows cached data instantly while refreshing it in
the background, retries failures, cleans up unused data, prefetches ahead of
need, and lets the UI update optimistically when the user edits something,
rolling back if the server says no. It's a good exercise because each
behavior is simple alone, but together they create real concurrency
problems (duplicate requests, out-of-order responses, a background refresh
overwriting an optimistic edit) that the design has to get right.

The hook is built as a reusable, playground-wide data layer whose cache
survives navigation between practices; later practices may use it, except
practice 12, which builds its own search cache on purpose. The demo is a
users list with a detail panel and a live cache inspector, backed by the
project's mock endpoints. Cross-practice rules from feature 001 apply (core
logic hand-built, explanation panel + demo controls).

## Goals

- [x] Any number of components asking for the same data trigger one request and always show the same value.
- [x] Data the user has seen before appears instantly on revisit, and is quietly brought up to date when it may be stale.
- [x] A response for something the user no longer looks at can never overwrite what they are looking at.
- [x] Edits feel instant, and a failed edit returns the UI exactly to its previous state with a clear explanation.
- [x] The learner can see the cache's inner state (keys, freshness, subscribers, requests) live while using the demo.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Suspense mode | Not selected; the hook reports status and components render their own states |
| Infinite/paginated queries | Practice 3 covers paging; this practice uses plain keys |
| Persisting the cache across full page reloads | The cache lives for the session |
| Server-rendered prefetching (hydrating the cache from the server) | Client-side data layer only |
| Request batching, normalization of entities | Beyond the practice's scope |
| The search cache for practice 12 | That practice builds its own on purpose |

## User Stories

### P1: Fetch and share data by key

- As a developer, I want to ask for data by a key and get its status and value so that components don't manage requests themselves.
- **Why P1:** This is the hook.
- **Independent Test:** Open the demo: the users list shows a loading state then the users; two components reading the same key show the same data, and the cache inspector shows one request for that key.

**Acceptance Criteria:**

- [x] AC-001: WHEN a component asks for a key with no cached data THEN system SHALL report a loading state, request the data once, and then report success with the data or an error with its message.
- [x] AC-002: WHEN several components ask for the same key at the same time THEN system SHALL make exactly one request and give all of them the same result.
- [x] AC-003: WHEN two keys contain the same parts in a different property order THEN system SHALL treat them as the same key.
- [x] AC-004: WHEN data for a key changes in the cache THEN every component showing that key SHALL update.
- [x] AC-005: WHEN a component stops using a key or unmounts THEN system SHALL stop updating it and SHALL NOT report errors about updating unmounted components.

### P1: Instant cached data, refreshed in the background

- As a user, I want data I've already seen to appear immediately and be refreshed quietly so that the app feels fast and stays correct.
- **Why P1:** Stale-while-revalidate is the core value of a cache.
- **Independent Test:** Open user A, then user B, then A again: A appears instantly with no loading state; with stale time 0 the inspector shows a background refresh and a small "refreshing" indicator while it runs.

**Acceptance Criteria:**

- [x] AC-006: WHEN a component asks for a key that has cached data THEN system SHALL provide that data immediately, without a loading state.
- [x] AC-007: WHEN cached data is older than the stale time (default 0 s) and a component starts using it THEN system SHALL refresh it in the background and report that a refresh is in progress separately from the initial loading state.
- [x] AC-008: WHEN cached data is fresh THEN system SHALL NOT request it again on mount.
- [x] AC-009: WHEN a background refresh fails THEN system SHALL keep showing the previous data and report the error alongside it.

### P1: Out-of-order responses can't win

- As a user switching quickly between items, I want to see only the item I last chose so that a slow response never replaces what I'm looking at.
- **Why P1:** The classic data-fetching race; without it the hook is wrong.
- **Independent Test:** With latency set to random, click through ten users quickly; the detail panel always ends on the last one clicked, never jumping back to an earlier one.

**Acceptance Criteria:**

- [x] AC-010: WHEN a component switches from key A to key B while A is loading THEN system SHALL show B's state only, and A's late response SHALL NOT appear in that component.
- [x] AC-011: WHEN a request's key has no remaining users THEN system SHALL cancel that request.
- [x] AC-012: WHEN a key is refreshed while an older request for it is still running THEN only the newest request's result SHALL be stored.

### P1: Retries with backoff

- As a user on a flaky connection, I want failed loads to retry on their own so that brief failures don't show errors.
- **Why P1:** Failure handling is part of the minimum usable hook.
- **Independent Test:** Set failure rate to 50% and open users; failures retry automatically, the inspector shows the attempt count, and after the last retry fails an error with a Retry button appears.

**Acceptance Criteria:**

- [x] AC-013: WHEN a request fails THEN system SHALL retry it up to the configured number of times (default 3) with increasing waits (about 1 s, 2 s, 4 s, with small random variation), capped at 30 s.
- [x] AC-014: WHILE retrying THEN system SHALL report the attempt number, and the first-load state SHALL stay "loading" until the final attempt fails.
- [x] AC-015: WHEN the final attempt fails THEN system SHALL report the error, and a manual retry SHALL start a fresh series of attempts.
- [x] AC-016: WHEN the browser is offline THEN system SHALL pause retries and resume them when it is back online.

### P1: Master-detail demo with cache inspector

- As a learner, I want a realistic screen and a live view of the cache so that I can see every behavior happen.
- **Why P1:** The practice is only understandable if the cache is visible.
- **Independent Test:** Use the list and detail; the inspector lists each key with its status, data age, freshness, subscriber count, request count and time until removal, updating live.

**Acceptance Criteria:**

- [x] AC-017: WHEN the demo opens THEN system SHALL show a users list and, after a user is selected, that user's detail panel with name, email, role and a favorite flag.
- [x] AC-018: WHEN the cache changes THEN the inspector SHALL show, for every key: its status, whether a request is in flight, data age, fresh/stale, subscriber count, total requests made, attempt number while retrying, and time left before removal when unused.
- [x] AC-019: WHEN the learner uses inspector actions THEN system SHALL support refreshing one key, invalidating all keys (mark stale and refresh those in use), and clearing the whole cache.

### P2: Refresh on focus and reconnect

- As a user returning to the tab, I want stale data refreshed automatically so that I don't act on outdated information.
- **Why P2:** Valuable freshness behavior on top of the core.

**Acceptance Criteria:**

- [x] AC-020: WHEN the tab regains focus or the browser comes back online THEN system SHALL refresh stale keys that are in use, and SHALL NOT refresh fresh or unused keys.
- [x] AC-021: WHEN focus events fire repeatedly in quick succession THEN system SHALL refresh each key at most once per 5 seconds for focus reasons.
- [x] AC-022: WHEN focus refreshing is turned off in demo controls THEN system SHALL NOT refresh on focus or reconnect.

### P2: Remove unused data

- As a user of a long session, I want unused cached data dropped after a while so that memory doesn't grow without limit.
- **Why P2:** Correctness of long-lived caches.

**Acceptance Criteria:**

- [x] AC-023: WHEN a key has had no users for the removal time (default 5 minutes) THEN system SHALL remove it from the cache.
- [x] AC-024: WHEN a component starts using a key before its removal time ends THEN system SHALL keep the entry and cancel the removal.

### P2: Prefetch

- As a user hovering over a list item, I want its details loaded ahead of time so that opening it is instant.
- **Why P2:** Perceived speed on top of caching.

**Acceptance Criteria:**

- [x] AC-025: WHEN the pointer rests on a user in the list for about 150 ms, or keyboard focus lands on it, THEN system SHALL prefetch that user's details unless they are already cached and fresh.
- [x] AC-026: WHEN a prefetched user is opened THEN system SHALL show the details without a loading state.
- [x] AC-027: WHEN prefetched data is never used THEN it SHALL still be removed after the removal time.

### P2: Optimistic edits with rollback

- As a user editing a user's name or toggling favorite, I want the change to show instantly everywhere and undo itself if saving fails.
- **Why P2:** The most instructive part of a data layer, built on top of reading.

**Acceptance Criteria:**

- [x] AC-028: WHEN the user saves an edit THEN system SHALL update every place showing that user (list and detail) immediately, before the server answers.
- [x] AC-029: WHEN an edit is saved while a refresh for the same data is in flight THEN the refresh result SHALL NOT overwrite the optimistic value.
- [x] AC-030: WHEN the server rejects the edit THEN system SHALL restore exactly the previous values everywhere and show an error toast with the reason.
- [x] AC-031: WHEN the server accepts the edit THEN system SHALL mark the related keys stale and refresh those in use, so the UI ends on the server's values.
- [x] AC-032: WHEN two edits to the same user overlap and the first fails THEN rollback SHALL NOT undo the second edit's value.
- [x] AC-033: WHILE an edit is saving THEN the edited field SHALL show a saving indicator and the save control SHALL be disabled for that field.

### P2: Demo controls

- As a learner, I want to tune the network and cache settings so that I can provoke each behavior.
- **Why P2:** Makes the practice explorable.

**Acceptance Criteria:**

- [x] AC-034: WHEN the learner changes latency (fixed 0–3000 ms or random 100–2000 ms), failure rate (0–100%), stale time (0 s, 5 s, 30 s, never), removal time (10 s, 1 min, 5 min), retry count (0–5), or focus refreshing (on/off) THEN system SHALL apply it to subsequent requests and timers.
- [x] AC-035: WHEN the learner sets the number of detail panels (1–3) THEN system SHALL show that many panels reading the same user, demonstrating shared data and a single request.

### P3: Shared across the playground

- As a learner, I want the cache to survive navigating to another practice and back so that I see a real app-wide cache.
- **Why P3:** Follows from the shared-layer decision; the demo works without it.

**Acceptance Criteria:**

- [x] AC-036: WHEN the learner leaves the practice and comes back within the removal time THEN system SHALL show cached data instantly, refreshing stale keys in the background.
- [x] AC-037: WHEN code outside this practice uses the hook THEN it SHALL share the same cache and settings model.

## Edge Cases

- WHEN the fetcher throws synchronously or returns a non-promise THEN system SHALL treat it as a failed request.
- WHEN stale time is "never" THEN system SHALL refresh only on explicit refresh or invalidation.
- WHEN a key is removed from the cache while a component still uses it (Clear cache) THEN system SHALL start a fresh load for that component.
- WHEN focus returns while a request for a key is already running THEN system SHALL NOT start another one.
- WHEN the removal time is shortened while entries are waiting for removal THEN the new time SHALL apply to waits that start afterwards.
- WHEN a mutation fails while offline THEN system SHALL roll back immediately and not queue the edit.
- WHEN an edit sets the same value as the current one THEN system SHALL still send it and handle the response normally.
- WHEN the selected user is deleted on the server (404) THEN the detail panel SHALL show "User not found" instead of retrying.

## Success Criteria

- [x] Mounting three components on the same key produces exactly one request (inspector and network agree).
- [x] Re-opening a cached user shows its details in the same frame as the click (no loading state rendered).
- [x] Clicking through 10 users within 2 seconds under random latency ends on the last-clicked user in 20 out of 20 runs, with no intermediate flash of an earlier user after the last click.
- [x] An optimistic edit is visible within one frame; after a forced failure, list and detail values equal the pre-edit values exactly in 10 out of 10 runs.
- [x] Zero serious or critical issues in an automated accessibility audit, in light and dark themes.

## Open Questions

- None. Decisions are recorded in [decisions.md](decisions.md).

## Notes

- The explanation panel should cover: a cache keyed by a stable serialization, subscribers and why components subscribe instead of owning state, stale-while-revalidate, in-flight dedupe, request tokens/abort for races, retry backoff with jitter, garbage collection timers, and optimistic updates with snapshot rollback and "cancel in-flight refreshes first".

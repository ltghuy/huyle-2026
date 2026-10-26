---
id: "005"
feature: data-fetching-hook
audited: 2026-10-07
result: passed
---

# Audit: Custom Data-Fetching Hook with Caching

Evidence from the T009 measurements in a production build (`next build && next start`) in headless Chrome, recorded in tasks.md "Verification Notes", plus the user's manual check of the prefetch / removal behavior in the cache inspector. Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Same data from many components → one request, same value | Met | See SC1: 3 detail panels on u-2 → 1 network request, inspector shows 3 users / 1 request |
| G2: Seen data appears instantly, quietly refreshed when stale | Met | See SC2; stale revisit made one background request with a "Refreshing" badge; back-navigation rendered the list from cache with 1 background refresh |
| G3: Old responses never overwrite what the user is looking at | Met | See SC3: 20/20 rapid-switch runs ended on the last-clicked user; in-flight refresh vs edit only ever rendered the new name |
| G4: Instant edits, exact rollback with a clear explanation | Met | See SC4; error toast on failure; overlapping edits kept the successful one |
| G5: Cache inner state visible live | Met | Inspector shows key, status, request activity, age, freshness, users, requests, attempt and removal countdown, updating live (AC-018; GC and prefetch countdowns observed) |
| SC1: 3 components on one key → exactly 1 request | Met | Network: 1 request; inspector: 3 users, 1 request |
| SC2: Cached user renders in the click's frame | Met | 3/3 switches: correct name before the next paint (~9 ms), loading state never rendered |
| SC3: 10 users in 2 s, 20/20 runs end on the last one, no flash | Met | 20/20 runs, 10 clicks within ~1.5 s under random latency, cache cleared each run; no other user appeared after the last click |
| SC4: Optimistic edit in one frame; 10/10 exact rollback | Met | 10/10: new name in list + detail within one frame; after failure both equal the pre-edit values |
| SC5: No serious/critical a11y issues, light + dark | Met | axe-core 4.10, both themes: 0 serious, 0 critical; 1 moderate `region` (pre-existing from 001) |

## Known minor issues (not blocking)

- Verified by code inspection only: no updates after unmount, synchronously throwing fetchers, shortened removal time applies to new waits.
- A focus refresh that starts while an optimistic edit is still saving can briefly show the server's old value before the edit's follow-up refresh (tasks.md).
- axe `region` (moderate) carried over from feature 001.

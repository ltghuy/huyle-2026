---
id: "005"
feature: data-fetching-hook
created: 2026-10-06
---

# Decisions: Custom Data-Fetching Hook with Caching

## Resolved

### Core behaviors

- **Decision:** Shared cache by key, stale-while-revalidate, in-flight dedupe, cancel requests for keys nobody uses, plus revalidate on focus/reconnect, retry with backoff, garbage collection and prefetch.

### Mutations

- **Decision:** Optimistic updates with snapshot rollback, followed by invalidation of related keys.
- **Rationale:** The most instructive part of a data layer.

### Suspense

- **Decision:** Not included; status-based results only.
- **Rationale:** Keeps the practice on caching mechanics, not a second rendering model.

### Demo

- **Decision:** Users list + detail panel (editable name, favorite toggle) + live cache inspector, backed by the project's mock endpoints with latency (fixed or random) and failure controls.

### Reach

- **Decision:** Reusable playground-wide data layer with an app-wide cache that survives navigation. Later practices may use it; practice 12 builds its own search cache on purpose.

### Defaults

- **Decision:** Stale time 0 s and removal (gc) time 5 minutes, matching TanStack Query's defaults; both adjustable in demo controls.
- **Rationale:** Makes stale-while-revalidate visible on every revisit.

## Tentative

### Retry defaults

- **Tentative Decision:** 3 retries, waits of ~1 s / 2 s / 4 s with ±25% jitter, capped at 30 s; 4xx responses (including 404) are not retried: client errors don't fix themselves. *(Wording synced with the code by quick task 002.)*
- **Revisit when:** Demos feel too slow to reach the error state.

### Focus throttle

- **Tentative Decision:** At most one focus-triggered refresh per key per 5 s.
- **Revisit when:** Focus refreshing feels unresponsive in use.

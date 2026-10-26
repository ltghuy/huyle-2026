---
id: "005"
feature: data-fetching-hook
created: 2026-10-07
---

# Technical Design: Custom Data-Fetching Hook with Caching

## Scope

**In scope:** a hand-built query client (cache, key hashing, observers,
stale-while-revalidate, dedupe, cancellation, retry with backoff and
offline pause, focus/online refresh, garbage collection, prefetch,
`setQueryData`/`cancelQueries`/`invalidateQueries`), a `useQuery` hook, a
field-level optimistic patch helper, mock users endpoints (list, detail,
patch) with latency/failure injection, the demo (list, detail, second
panel, controls), the live cache inspector, and the explanation.

**Out of scope:** Suspense, infinite queries, persistence, SSR hydration,
batching/normalization, practice 12's cache, automated tests.

## Research Summary

> Sources: React 19 `useSyncExternalStore` docs, Next.js 16 bundled docs (`RouteContext`), TanStack Query's documented defaults (staleTime 0, gcTime 5 min, 3 retries, exponential backoff) as behavioral reference only; no code from it is used.

- **`useSyncExternalStore` subscribe as the observer hook:** React calls `subscribe` when a component mounts or when the subscribe function changes (key change), and calls its cleanup on unmount. That lifecycle is exactly "observer added/removed", so the hook needs no extra effect to track usage. `getSnapshot` must return the same object until the entry changes, so entry state objects are replaced immutably.
- **`getSnapshot` for a key with no entry** returns a shared constant "loading, no data" state. Entries are created in `subscribe` (commit phase), never during render, keeping render pure.
- **Route handlers with params:** `ctx: RouteContext<'/api/.../users/[id]'>`, `const { id } = await ctx.params` (Next 16).
- **Race safety:** each fetch gets a monotonically increasing token per entry. A result is stored only if its token is still the entry's current one. Cancelling bumps the token and aborts the request.
- **Optimistic rollback that survives overlapping edits:** a whole-object snapshot rollback would undo a second, later edit. Instead each mutation records a field patch. On failure it reverts only fields whose current value is still the value it set.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| App-wide client service | Module-level store + `useSyncExternalStore`, constant server snapshot | Context providers for a singleton | src/practices/toast-notifications/toast-store.ts |
| Practice registration | Own route + `built: true` | Touching `[slug]` | src/app/(playground)/practices/infinite-scroll/page.tsx |
| API | Thin routes → Zod → `server-only` store; `{ error: { message } }` | Logic in routes | src/app/api/practices/infinite-scroll/feed/route.ts |
| Mock data | Module-level in-memory store | n/a | src/server/practices/infinite-scroll/feed.store.ts |
| JSX handlers | Named `handleX` unless a one-line call | Multi-line inline handlers | .claude/rules/react-handbook/05-event-handlers.md |
| Colors | Tokens; no muted-on-muted text; audit both themes | `text-muted-foreground` on `bg-muted` | .agents/knowledge.md |
| Cycling/racing UI state | Read live values in handlers | Stale rendered values | .agents/knowledge.md |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `toast` | src/practices/toast-notifications/toast-store.ts | Error toast on failed optimistic edit (AC-030) |
| Button, Input, Card, Skeleton | src/components/ui/* | UI |
| `DemoControls`, `DemoStage` | src/components/playground/* | Layout |
| `jsonError`, `parseBody` | src/lib/http.ts | Endpoints |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| QueryEntry | One cache entry (internal) |
| QueryState | Immutable snapshot of an entry, read by components and the inspector |
| QueryDefaults | App-wide default options |
| UserSummary / UserDetail | Mock API shapes |

All new.

#### QueryState (`src/practices/data-fetching-hook/query-client.ts`)

- `status` ("loading" | "success" | "error"): whether data or an error exists
- `fetchStatus` ("idle" | "fetching" | "paused"): request activity, independent of `status`
- `data?`, `error?` (Error), `dataUpdatedAt` (ms, 0 = never), `attempt` (0 when idle), `invalidated` (boolean)

#### QueryEntry (internal)

- `key` (unknown[]), `hash` (string), `state` (QueryState), `fetcher`, `observers` (number), `token` (number), `abort?` (AbortController), `promise?`, `gcTimer?`, `gcAt?` (ms timestamp for the inspector), `requests` (number), `lastFocusRefetch` (ms)

#### QueryDefaults

- `staleTime` (ms or `Infinity`, default 0), `gcTime` (ms, default 300 000), `retry` (0–5, default 3), `refetchOnFocus` (boolean, default true)

#### UserSummary / UserDetail (`src/server/practices/data-fetching-hook/users.schema.ts`)

- Summary: `id`, `name`, `role`, `favorite`
- Detail: Summary + `email`, `bio`, `updatedAt`

### API Contracts

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/practices/data-fetching-hook/users` | GET | `latencyMs` (−1 = random 100–2000), `failRate` | `200 { data: UserSummary[] }`; `500` simulated |
| `/api/practices/data-fetching-hook/users/[id]` | GET | same | `200 { data: UserDetail }`; `404` unknown or "deleted" user; `500` |
| `/api/practices/data-fetching-hook/users/[id]` | PATCH | query as above; body `{ name?: string (1–60), favorite?: boolean }` | `200 { data: UserDetail }`; `404`; `422`; `500` |

### Currently Exposed Fields

No AC enumerates fields from existing code.

## Decisions

| Decision | Rationale |
|----------|-----------|
| **Module-level `queryClient`** with per-entry listeners and an "any change" listener set (for the inspector) | App-wide cache that survives navigation (AC-036/037); no provider |
| `hashKey(key)`: JSON with object keys sorted recursively | Equal keys in any property order hash the same (AC-003) |
| `useQuery(key, fetcher, options)` = `useSyncExternalStore(subscribe(hash), getSnapshot(hash), serverSnapshot)`; `subscribe` registers the observer, ensures the entry exists, and starts a fetch when there's no data or it's stale; `fetcher`/`key` are kept in refs updated in a layout effect (which runs before the store subscribes) | Observer lifecycle comes from React (AC-004/005/010); key switches resubscribe automatically, so a late A response lands only in A's entry |
| Snapshot replaced immutably on every change; unchanged entries keep their object | Components re-render only for their own key |
| `fetchQuery(entry, { cancelRefetch })`: dedupe returns the running promise (mount, focus, prefetch); explicit refresh/invalidate cancels the running one and starts fresh | AC-002 dedupe; AC-012 newest wins |
| Token per fetch; store result only if `token === entry.token`; `cancel` = `token++` + `abort()` | Late or cancelled responses are ignored (AC-010–012, AC-029) |
| Observers drop to 0 → after a 0 ms delay, if still 0: cancel the running fetch (unless it was a prefetch) and schedule gc at `gcTime` | AC-011, AC-023; the delay absorbs StrictMode/remount churn |
| Observer added → clear the gc timer | AC-024 |
| Retry loop: up to `retry` extra attempts, wait `min(1000·2ⁿ, 30 000) × (0.75–1.25)`; 4xx (`HttpError` with status 400–499, e.g. 404) is not retried; offline (`navigator.onLine === false`) → `fetchStatus: "paused"` until `online` | AC-013–016, 404 edge case |
| `status` stays "loading" (no data) through retries; `attempt` reported | AC-014 |
| Background refresh failure keeps `data`, sets `error` and `status: "error"`; the hook exposes both | AC-009 (UI shows stale data + error badge) |
| Focus/online listeners attached once, lazily on first subscribe; refresh entries with `observers > 0`, stale, and `now − lastFocusRefetch ≥ 5 s`; skipped when `refetchOnFocus` is off; `online` also resumes paused fetches | AC-020–022 |
| `isStale = invalidated ‖ (staleTime !== Infinity && now − dataUpdatedAt ≥ staleTime)` | AC-007/008, "never" edge case |
| `prefetchQuery(key, fetcher)`: skip if fresh; fetch without an observer, marked `prefetch`; gc scheduled when it settles if still unused | AC-025–027 |
| `setQueryData(key, updater)`, `getQueryData(key)`, `cancelQueries(predicate)`, `invalidateQueries(predicate)` (mark invalidated; refetch those with observers), `refetch(key)`, `clear()` (remove all; mounted observers re-create and load) | Mutations and inspector actions (AC-019, AC-028–031, clear edge case) |
| **`useOptimisticPatch`:** `mutate(userId, patch)` → `cancelQueries` for the list + that user → apply the patch to both cache entries → request → on error, revert each patched field only if its current value still equals the patched value, then toast; on success or error, invalidate both keys | Instant updates (AC-028), no overwrite by in-flight refresh (AC-029), exact rollback (AC-030), ends on server values (AC-031), overlapping edits safe (AC-032) |
| Pending fields tracked per user in the helper's state; the save control is disabled and shows "Saving…" | AC-033 |
| Network settings (latency, failure) in a module-level object read by the fetchers at request time; cache defaults via `queryClient.setDefaults()` | Controls apply to the next request/timer (AC-034) |
| Inspector: subscribes to "any change"; a 1 s ticker re-renders ages and gc countdowns; rows sorted by key; actions: Refresh (row), Invalidate all, Clear cache | AC-018–019 |
| Prefetch on list item: pointer enter starts a 150 ms timer (cleared on leave); focus prefetches immediately | AC-025 |
| Mock users: 20 users; `u-13` appears in the list but its detail returns 404 ("deleted on the server") | Exercises the 404 edge case without an extra control |
| Detail panels keyed by user id; the second panel is a toggle | AC-035, shared-key dedupe |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Users schema | src/server/practices/data-fetching-hook/users.schema.ts | new | Zod (query, patch body), types |
| Users store | src/server/practices/data-fetching-hook/users.store.ts | new (`server-only`) | 20 users, get/list/patch, latency/failure helper |
| Users routes | src/app/api/practices/data-fetching-hook/users/route.ts, users/[id]/route.ts | new | GET list; GET + PATCH one |
| Key hashing | src/practices/data-fetching-hook/hash-key.ts | new | Stable serialization |
| Query client | src/practices/data-fetching-hook/query-client.ts | new | Cache, fetch/retry/cancel, gc, focus/online, prefetch, set/get/cancel/invalidate/clear, defaults, inspector feed |
| useQuery | src/practices/data-fetching-hook/use-query.ts | new (client) | Subscription hook, refetch |
| useOptimisticPatch | src/practices/data-fetching-hook/use-optimistic-patch.ts | new (client) | Field-level optimistic mutation |
| Users API | src/practices/data-fetching-hook/users-api.ts | new | Fetchers, `HttpError`, network settings, query keys |
| UsersList | src/practices/data-fetching-hook/users-list.tsx | new (client) | List, selection, prefetch on hover/focus, favorite toggle |
| UserDetail | src/practices/data-fetching-hook/user-detail.tsx | new (client) | Detail, refreshing/error badges, rename form, 404 state |
| CacheInspector | src/practices/data-fetching-hook/cache-inspector.tsx | new (client) | Live table + actions |
| Demo / Explanation | src/practices/data-fetching-hook/demo.tsx, explanation.tsx | new | Controls, layout, notes |
| Route / Catalog | src/app/(playground)/practices/data-fetching-hook/page.tsx, src/practices/catalog.ts | new / modify | Registration |

## Data Flow

```mermaid
sequenceDiagram
  participant C as Component (useQuery)
  participant Q as queryClient
  participant API as /users API
  C->>Q: subscribe(hash) → observers++
  alt no data or stale
    Q->>Q: dedupe? else token++, AbortController
    Q->>API: fetch (attempt 1..n, backoff, pause offline)
    API-->>Q: data / error
    Q->>Q: token current? store → new state object
  end
  Q-->>C: notify → getSnapshot(hash)
  Note over C,Q: key change → unsubscribe A, subscribe B; A's late result stays in A
  Note over C,Q: observers 0 → (0 ms) cancel, gc timer(gcTime)
  participant M as useOptimisticPatch
  M->>Q: cancelQueries(list, user) → apply patch → PATCH
  API-->>M: ok → invalidate | fail → revert unchanged fields + toast → invalidate
```

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | fetch lifecycle | query-client.ts, use-query.ts | Planned |
| AC-002 | dedupe | query-client.ts | Planned |
| AC-003 | hashKey | hash-key.ts | Planned |
| AC-004 | per-entry listeners | query-client.ts | Planned |
| AC-005 | uSES unsubscribe | use-query.ts | Planned |
| AC-006 | cached snapshot | use-query.ts | Planned |
| AC-007 | stale → background fetch, fetchStatus | query-client.ts | Planned |
| AC-008 | isStale | query-client.ts | Planned |
| AC-009 | keep data on error | query-client.ts, user-detail.tsx | Planned |
| AC-010 | per-key snapshots | use-query.ts | Planned |
| AC-011 | cancel at 0 observers | query-client.ts | Planned |
| AC-012 | tokens, cancelRefetch | query-client.ts | Planned |
| AC-013 | backoff | query-client.ts | Planned |
| AC-014 | attempt, loading through retries | query-client.ts | Planned |
| AC-015 | manual retry restarts | query-client.ts, user-detail.tsx | Planned |
| AC-016 | offline pause | query-client.ts | Planned |
| AC-017 | list + detail | users-list.tsx, user-detail.tsx | Planned |
| AC-018 | inspector fields | cache-inspector.tsx | Planned |
| AC-019 | inspector actions | cache-inspector.tsx, query-client.ts | Planned |
| AC-020 | focus/online refresh | query-client.ts | Planned |
| AC-021 | 5 s throttle | query-client.ts | Planned |
| AC-022 | refetchOnFocus off | query-client.ts, demo.tsx | Planned |
| AC-023 | gc | query-client.ts | Planned |
| AC-024 | gc cancel | query-client.ts | Planned |
| AC-025 | prefetch triggers | users-list.tsx, query-client.ts | Planned |
| AC-026 | prefetched → instant | query-client.ts | Planned |
| AC-027 | prefetch gc | query-client.ts | Planned |
| AC-028 | optimistic apply | use-optimistic-patch.ts | Planned |
| AC-029 | cancel before apply | use-optimistic-patch.ts | Planned |
| AC-030 | rollback + toast | use-optimistic-patch.ts | Planned |
| AC-031 | invalidate after | use-optimistic-patch.ts | Planned |
| AC-032 | field-level revert | use-optimistic-patch.ts | Planned |
| AC-033 | pending fields | use-optimistic-patch.ts, user-detail.tsx, users-list.tsx | Planned |
| AC-034 | controls | demo.tsx, users-api.ts, query-client.ts | Planned |
| AC-035 | second panel | demo.tsx | Planned |
| AC-036 | module-level cache | query-client.ts | Planned |
| AC-037 | reusable API | use-query.ts | Planned |

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

No automated tests. Browser verification on a production build, read
through the inspector and network resource entries: dedupe with three
panels, same-frame cached render (MutationObserver around the click),
20 runs of rapid switching under random latency, 10 forced optimistic
failures comparing values, overlapping edits, retries with attempt counts,
offline pause (overridden `navigator.onLine` + events), focus throttling,
gc with a 10 s removal time, prefetch on hover, 404 user, axe-core in
both themes. Endpoints checked with curl.

## Considerations

### Error Handling

- `HttpError` carries status and the server's message; 404 → "User not found", no retries.
- Background refresh errors keep data and show an error badge with Retry.
- Optimistic failures: field-level revert + error toast; never thrown into React.
- Fetchers that throw synchronously are caught inside the fetch loop.

### Security

- PATCH body validated (name 1–60 chars, boolean favorite); text rendered as text.
- Latency capped at 10 s.

### Performance

- Per-key subscriptions: an update to one user re-renders only components using that key (plus the inspector).
- The inspector's 1 s ticker re-renders only the inspector.

## Deviations (applied during implement)

| Planned | Actual | Why |
|---------|--------|-----|
| "Mount a second detail panel" toggle | "Detail panels (same key)" selector, 1–3 | Success criterion 1 needs three components on one key; AC-035 wording updated |
| `subscribe(key, …)` | `subscribe(hash, key, …)` | Makes `hash` a real dependency of the hook's subscribe callback (no lint suppression) |
| Invalidate after every settled edit | Invalidate only when the last in-flight edit for that user settles | A refresh triggered by the first edit would overwrite a second, still-pending optimistic edit |

## Open Questions

- None.

---
id: "013"
feature: debounced-search
type: greenfield
scope: complex
status: done
branch: worktree-agent-a57b1a8466e44b55c
created: 2026-10-07
---

# Feature: Debounced Search + API Cache

## Overview

Practice 12 of the playground. The learner wants to build search-as-you-type
that feels instant without hammering the server or showing wrong results.
The naive version (fetch on every keystroke, set state when the response
comes back) has three bugs that only show up on a real network: it sends a
request for every character, it re-downloads results it already had a
moment ago, and when responses come back out of order an older, slower
response overwrites the newer one, so the list shows results for "de" while
the box says "desk lamp".

The demo is a product search over a few thousand generated products served
by the project's own mock API, whose latency varies per request (random
jitter, or "shorter queries are slower") so responses really do arrive out
of order, with error injection. The learner types (or lets a typing robot
type), watches a live timeline of every debounced keystroke, cache hit,
request, cancellation and dropped response, inspects the cache, and turns
each technique off to see the bug it prevents. Cross-practice rules from
feature 001 apply: the core pattern is hand-built (no library, no ready-made
combobox), the page has an explanation guide, demo controls and a live demo.

## Goals

- [x] Typing a query sends one request after the learner pauses, not one per keystroke, and the learner can see each skipped keystroke.
- [x] The results shown always belong to the latest query once searching settles, even when responses arrive out of order.
- [x] Repeating a recent query shows its results instantly from a bounded, expiring cache, refreshed in the background when it is getting old.
- [x] The learner can switch each technique off and reproduce the bug it prevents, with the cause visible in the timeline.
- [x] The search box is a fully keyboard-operable, screen-reader-friendly combobox.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Fuzzy matching, typo tolerance, relevance ranking beyond "starts with" first | The practice is about the client request pattern, not search quality |
| Persisting the cache across reloads (localStorage, IndexedDB) | A per-session memory cache is the pattern being practiced |
| Recent searches, query suggestions, prefetching | Separate patterns; would blur what each technique fixes |
| Paging or infinite scroll of results | Practice 3 covers it; results are capped |
| A library (lodash.debounce, SWR, TanStack Query) or shadcn Command/Combobox | The point is to build the pattern by hand |
| Reusing practice 4's query cache | This practice's search cache is the thing being practiced; the guide compares them |

## User Stories

### P1: Search as you type, debounced

- As a shopper, I want results to appear as I type without waiting for a submit so that I find products quickly.
- **Why P1:** The core behavior.
- **Independent Test:** Type "desk lamp" quickly: one request goes out about 300 ms after the last key, the timeline shows the earlier keystrokes as debounced, and the list shows lamps with "desk" and "lamp" highlighted.

**Acceptance Criteria:**

- [x] AC-001: WHEN the shopper types a query without fresh cached results THEN system SHALL search only after no keystroke for the debounce delay (default 300 ms, adjustable 0–1000 ms), showing that it is waiting; a keystroke during the wait SHALL restart it, and the cancelled wait SHALL be recorded as debounced.
- [x] AC-002: WHEN the shopper presses Enter with no option highlighted THEN system SHALL search immediately, without waiting for the delay.
- [x] AC-003: WHEN the query is shorter than the minimum length (default 2, adjustable 1–4) THEN system SHALL NOT search, SHALL cancel any pending wait or request, clear the results and show a hint with example queries.
- [x] AC-004: WHEN two queries differ only in case, accents, surrounding or repeated spaces (e.g. "Café  Mug " and "cafe mug") THEN system SHALL treat them as the same search: one cache entry, and changing one into the other SHALL NOT start a new search; queries SHALL be cut to 100 characters.
- [x] AC-005: WHEN results arrive THEN system SHALL show up to 20 products (name with matched word beginnings highlighted, category, price) and "N of M results for “query”".

### P1: Never show stale results

- As a shopper, I want the list to always match what I typed so that I never act on wrong results.
- **Why P1:** The bug that makes naive search untrustworthy.
- **Independent Test:** With debounce off and "shorter queries are slower", let the robot type "desk lamp": older requests are aborted or dropped, and the list ends on "desk lamp" results.

**Acceptance Criteria:**

- [x] AC-006: WHEN a newer search starts (request, cache hit, or the query becomes too short) THEN system SHALL abort the older in-flight request and mark it aborted in the timeline.
- [x] AC-007: WHEN a response arrives for a search that is no longer the latest THEN system SHALL NOT change the displayed results or error, SHALL mark it "stale, dropped" in the timeline, and SHALL still store successful data in the cache.
- [x] AC-008: WHILE a newer search is loading THEN system SHALL keep the previous results visible but dimmed with an "Updating…" indicator, labelled with the query they belong to; WHEN there are no previous results THEN it SHALL show placeholder rows.

### P1: Cache recent results

- As a shopper, I want going back to an earlier query (e.g. deleting characters) to be instant so that search feels fast.
- **Why P1:** The "API cache" half of the practice.
- **Independent Test:** Search "lamp", then "lamps", then delete the "s": "lamp" appears instantly and the timeline shows a cache hit with no request.

**Acceptance Criteria:**

- [x] AC-009: WHEN a query's results were fetched within the fresh time (default 30 s; 5 s, 30 s or 2 min) THEN system SHALL show them on that keystroke, without waiting for the debounce delay and without a request, and record a cache hit.
- [x] AC-010: WHEN a query's cached results are older than the fresh time but younger than 5 minutes THEN system SHALL show them immediately, labelled "cached Ns ago · refreshing", request fresh results in the background, and replace them when they arrive (stale-while-revalidate).
- [x] AC-011: WHEN the cache holds more entries than its limit (default 20; 5, 20 or 50) THEN system SHALL evict the least recently used one; entries older than 5 minutes SHALL never be shown; failed responses SHALL NOT be cached.
- [x] AC-012: WHILE the demo is shown THEN a cache inspector SHALL list entries most recently used first with query, result count, age, fresh/stale state and hit count, and offer "Clear cache".
- [x] AC-013: WHEN the learner leaves the practice and comes back in the same session THEN the cache SHALL still hold its entries; a reload SHALL start empty.

### P1: See every request

- As a learner, I want a live timeline of what the search did so that I can see debouncing, caching, cancellation and out-of-order responses happen.
- **Why P1:** Without it the techniques are invisible.

**Acceptance Criteria:**

- [x] AC-014: WHEN search events happen THEN a timeline SHALL list them newest first (up to 50): debounced wait, cache hit, background refresh, and request with its outcome (pending, shown, aborted, stale dropped, failed); each with the query, start time relative to the first entry, duration, and a bar on a shared time axis so overlapping and out-of-order requests are visible; outcomes SHALL be conveyed by text and icon, not colour alone; the learner can clear it.
- [x] AC-015: WHILE the demo is shown THEN counters SHALL show keystrokes, debounced, requests sent, cache hits, aborted, stale dropped and errors, reset together with the timeline.

### P2: Turn techniques off to see the bugs

- As a learner, I want to disable each technique and compare so that I understand what each one fixes.
- **Why P2:** The comparison is the lesson; search works without it.
- **Independent Test:** Choose "All off (naive)", let the robot type "desk lamp" with "shorter queries are slower": the timeline shows 7 requests completing out of order and a warning that the list shows results for an older query.

**Acceptance Criteria:**

- [x] AC-016: WHEN the learner switches off debounce, cache, abort or the stale-response guard (each on by default) THEN the next search SHALL behave without it: no debounce → a search per changed query; no cache → always the network; no abort → older requests run to completion; no guard → whichever response arrives last is shown.
- [x] AC-017: WHEN nothing is pending and the displayed results belong to a different query than the input THEN system SHALL show a warning naming both queries; with the guard on this SHALL never happen.
- [x] AC-018: WHEN the learner picks a preset ("All on" or "All off (naive)") THEN all four techniques SHALL switch at once.
- [x] AC-019: WHEN the learner starts the typing robot THEN it SHALL type the chosen phrase into the box one character at a time at the chosen speed (fast 50 ms or slow 400 ms per character) through the same path as real typing; typing manually or pressing Stop SHALL stop it.

### P2: Server conditions and errors

- As a learner, I want to control the mock server so that I can create slow, out-of-order and failing responses on demand.
- **Why P2:** The bugs only show on an imperfect network.

**Acceptance Criteria:**

- [x] AC-020: WHEN the learner changes server latency (base 0–2000 ms, default 300; extra random 0–1500 ms, default 700), latency mode (random, or shorter queries slower) or failure rate (0–100%) THEN the next request SHALL use them.
- [x] AC-021: WHEN the latest search fails THEN system SHALL show the error inline with Retry, which searches the same query again over the network immediately; WHEN an older search fails THEN it SHALL be dropped without affecting the display.
- [x] AC-022: WHEN a search returns no products THEN system SHALL say "No products match “query”" and offer example queries to try.

### P2: Accessible combobox

- As a keyboard or screen-reader user, I want to move through results and pick one so that search works without a mouse.
- **Why P2:** Required for a real search box.

**Acceptance Criteria:**

- [x] AC-023: WHILE results are shown THEN the input SHALL act as a combobox with a listbox: ArrowDown/ArrowUp move the highlighted option (wrapping, kept in view, announced via the active option), Enter picks the highlighted option, Escape closes the list and a second Escape clears the box, and clicking an option picks it; the picked product SHALL be shown in a details card.
- [x] AC-024: WHEN a search settles THEN a polite status message SHALL announce the result ("20 of 134 results for lamp", "No products match …", the error), not every keystroke.

### P3: Shareable query

- As a shopper, I want the query in the URL so that a reload or a shared link shows the same search.
- **Why P3:** Nice-to-have, common in real search pages.

**Acceptance Criteria:**

- [x] AC-025: WHEN a search runs THEN system SHALL put the query in the URL (`?q=`) without adding a history entry per keystroke, and remove it when the box is cleared; WHEN the page opens with `?q=` THEN the box SHALL be prefilled and the search SHALL run immediately.

## Edge Cases

- WHEN the same query is already being fetched THEN a repeated trigger (Enter, debounce firing) SHALL NOT send a duplicate request.
- WHEN a request is aborted while its response body is being read THEN it SHALL be recorded as aborted and never shown.
- WHEN the network is unreachable THEN the latest search SHALL show an offline-style error with Retry.
- WHEN the debounce delay is 0 THEN every changed query SHALL search immediately (same as debounce off).
- WHEN the box holds only spaces or pattern characters (`%`, `*`, `(`) THEN they SHALL be treated literally and not break the server.
- WHEN the demo is left while a wait or request is pending THEN timers SHALL be cleared and requests aborted.
- WHEN settings change while the robot is typing THEN it SHALL keep typing with the new settings.
- WHEN the URL's `q` is longer than 100 characters THEN it SHALL be cut like typed input.

## Success Criteria

- [x] With default settings and an empty cache, the robot typing "desk lamp" fast sends exactly 1 request; with debounce off it sends 7 (one per distinct query of 2+ characters).
- [x] With the guard on, 0 mismatches between the input and the shown results across 20 robot runs with debounce off and "shorter queries slower"; with abort and guard off, the mismatch warning appears in at least 1 of those runs (the bug is reproducible).
- [x] A fresh cached query is shown in under 50 ms with 0 network requests.
- [x] A scripted check of the search logic over 200 random sequences of typing and out-of-order responses (guard on) ends with the shown results matching the last query every time.
- [x] Every search interaction (type, move, pick, close, clear, retry) works with the keyboard alone.
- [x] Zero serious or critical accessibility issues in both themes, and no horizontal scrolling at 360 px width.

## Open Questions

- None. Defaults chosen without asking are recorded in [decisions.md](decisions.md).

## Notes

- The explanation guide should cover: why debounce (and debounce vs throttle), minimum length and normalization for cache keys, why responses arrive out of order, `AbortController` vs a "latest request" guard (abort saves work; the guard is the guarantee), cache with TTL + LRU + stale-while-revalidate, caching dropped responses, keeping old results while loading, combobox semantics, URL sync with `replaceState`, and how this compares with practice 4's general query cache.

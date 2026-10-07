---
id: "013"
feature: debounced-search
created: 2026-10-07
---

# Decisions: Debounced Search + API Cache

Decisions on gray areas and ambiguities. This feature was built by an agent
without a discussion round, so every decision below was a default chosen by
the agent and is marked "(agent default, not asked)" for the user to review.

## Resolved

### Search domain and data

- **Question:** What does the box search? (agent default, not asked)
- **Decision:** A product catalog generated deterministically on the server: every combination of 12 styles × 12 materials × 39 product types (5,616 products, a few with accented names such as "Café Mug", "Crème Brûlée Dish", "Jalapeño Grinder"), each with id, name, category and price. Match = every query word is the start of a word in the name or category (case- and accent-insensitive); names that start with the query first, then alphabetical; top 20 plus the total count.
- **Rationale:** Short prefixes ("d", "de") match many products and long ones few, so result changes are easy to see while typing; accented names exercise normalization; deterministic data makes runs repeatable.
- **Caveats:** Ranking is deliberately simple (Out of Scope).

### Debounce defaults

- **Question:** Delay, trigger and minimum length? (agent default, not asked)
- **Decision:** Trailing debounce of 300 ms (0–1000 ms adjustable), Enter searches immediately, minimum 2 characters (1–4 adjustable) after normalization.
- **Rationale:** 250–400 ms is the common range between "feels live" and "one request per word"; Enter is the expected escape hatch; 1-character queries mostly return noise and are the most expensive.
- **Caveats:** No leading-edge or max-wait option; the guide explains them and throttle.

### Query normalization (cache key)

- **Question:** Which queries count as the same? (agent default, not asked)
- **Decision:** Trim, collapse inner whitespace, lowercase, strip accents (NFD + remove marks), cut to 100 characters. The normalized string is the cache key, the request parameter, and what "same query" means for deduping. The server applies the same function.
- **Rationale:** "Lamp", "lamp " and "lámp" return the same results, so they must share one cache entry and not trigger a new search; one shared function keeps client and server in agreement.
- **Caveats:** Word order still matters ("desk lamp" ≠ "lamp desk") even though results are identical; sorting words would be a further optimization the guide mentions.

### Cache policy

- **Question:** TTL, size and stale behavior? (agent default, not asked)
- **Decision:** Module-level memory cache: fresh for 30 s (5 s / 30 s / 2 min), usable stale up to 5 min with stale-while-revalidate, at most 20 entries (5 / 20 / 50) with least-recently-used eviction (a `Map` re-inserted on read). Successful responses are cached even when dropped as stale; errors are never cached.
- **Rationale:** Search results change rarely within minutes; SWR gives instant display plus correctness; a small LRU bound keeps memory flat and makes eviction observable at size 5. Caching dropped responses is free value: the data is correct for its own key.
- **Caveats:** Cleared on reload (Out of Scope: persistence).

### Fresh cache hits skip the debounce

- **Question:** Should a query with cached results still wait for the debounce delay? (agent default, not asked; found during verification)
- **Decision:** A keystroke whose normalized key has a *fresh* cache entry is answered on that keystroke, without waiting (a pending wait for another key is logged as debounced). Stale entries still wait for the delay, because using them starts a background request.
- **Rationale:** Debounce exists to save requests; a fresh hit sends none, so waiting only adds latency. Measured before the change: deleting back to a cached query took ~350 ms; after: under 20 ms. Stale entries would otherwise send a refresh per keystroke.
- **Caveats:** Typing through a sequence of cached keys updates the list on every keystroke (cheap: no network).

### Stale-response handling

- **Question:** Abort, guard, or both? (agent default, not asked)
- **Decision:** Both, separately switchable. Every search start (request, cache hit, too-short clear) increments a run id; a response may change the display only if its run id is still the current one. Superseded in-flight requests are aborted with `AbortController`, and the server honors the abort signal while it waits.
- **Rationale:** Aborting saves bandwidth and server work but can't be the guarantee (a response may already be resolved, and some sources can't be aborted); the run-id guard is the guarantee. Keeping them separate lets the learner see what each does.
- **Caveats:** None.

### Comparison mode

- **Question:** How does the learner see the bugs? (agent default, not asked)
- **Decision:** Four technique switches (debounce, cache, abort, stale guard) with "All on" / "All off (naive)" presets on one search box, plus a mismatch warning when the shown results belong to another query, plus a typing robot (fast 50 ms or slow 400 ms per character). Not a side-by-side second search box.
- **Rationale:** One box with switches isolates each technique's effect; the robot makes races reproducible (humans and test tools can't type at a steady rate); a second box would double the UI on small screens without teaching more.
- **Caveats:** Comparing two settings needs two runs; counters and the timeline make that easy.

### Mock latency

- **Question:** How do responses arrive out of order? (agent default, not asked)
- **Decision:** Server latency = base (default 300 ms) + random extra (0–700 ms by default). A second mode, "shorter queries are slower", adds 150 ms per character below 8 characters, so earlier (shorter) queries reliably finish after later ones. Failure rate 0–100% returns 500.
- **Rationale:** Random jitter is realistic; the deterministic mode makes the stale-response bug reproducible on the first try and mirrors reality (broad queries are more expensive).
- **Caveats:** None.

### Timeline

- **Question:** What does the timeline show? (agent default, not asked)
- **Decision:** One row per event, newest first, max 50: debounced wait (from the keystroke to the keystroke that cancelled it), cache hit, background refresh, request (pending → shown / aborted / stale dropped / failed / failed (dropped)). Each row has a text label + icon and a bar on a shared time axis covering the last 4 s of activity (older rows keep their text, without a bar); counters above it.
- **Rationale:** Bars on one axis are what make out-of-order completion visible; text labels keep it accessible.
- **Caveats:** Debounced rows dominate when typing fast; the counters summarize. The 4 s window was added during verification: an axis over all 50 rows spanned several robot runs and squeezed each run's bars to slivers.

### URL sync

- **Question:** When does the URL change? (agent default, not asked)
- **Decision:** `history.replaceState` with `?q=<typed text, trimmed>` whenever a search runs (not per keystroke), removed when the box is cleared or too short; the page reads `searchParams` on the server, so the box renders prefilled and the search runs on mount without waiting for the debounce.
- **Rationale:** `replaceState` avoids one history entry per query (Back leaves the page, as users expect from a search-as-you-type box); reading on the server avoids a flash of an empty box. Makes the route dynamic, which is fine for a playground page.
- **Caveats:** Back/Forward don't step through queries.

### Combobox presentation

- **Question:** Popup or inline list? (agent default, not asked)
- **Decision:** APG combobox pattern (`role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`) with the listbox rendered inline below the input, not floating. Escape hides it until the next keystroke. Picking an option shows a details card (and doesn't change the query).
- **Rationale:** The list is the demo's main content, so it shouldn't cover the timeline; inline rendering still uses popup semantics correctly because `aria-expanded` follows visibility.
- **Caveats:** ui-ux-pro-max suggests shadcn `Command` for search; not used because the practice rule forbids the ready-made version of the practiced pattern.

### Visual direction

- **Question:** Adopt the generated design system (dark-only OLED palette, Fira fonts)? (agent default, not asked)
- **Decision:** No. Keep the playground's shadcn tokens, Geist, and light + dark themes; take the UX rules (visible label, loading feedback, empty state with suggestions, focus rings, reduced motion, 360 px layout).
- **Rationale:** Rule 03 says to map design to the existing CSS variables; every practice shares one look.
- **Caveats:** None.

## Tentative

None.

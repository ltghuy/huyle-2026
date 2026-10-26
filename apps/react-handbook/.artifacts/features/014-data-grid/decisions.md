---
id: "014"
feature: data-grid
created: 2026-10-08
---

# Decisions: Advanced Data Grid

Decisions on gray areas and ambiguities. This feature was built by an agent
without a discussion round, so every decision below was a default chosen by
the agent and is marked "(agent default, not asked)" for the user to review.

## Resolved

### Dataset

- **Question:** What does the grid show? (agent default, not asked)
- **Decision:** An employee directory generated deterministically on the server, 1,000 or 10,000 rows: id, name (some accented: José, Zoë, Søren, Chloé…), department (8 values), role (free text such as "Senior Frontend Engineer 2"), location (10 cities), salary (whole dollars), start date (calendar date, no time), status (Active, On leave, Contractor), rating (1–5, empty for about 8% of rows: new hires).
- **Rationale:** Covers every comparison type (text, numbers inside text, number, date, enum, empty values) and every filter type; accented names exercise locale-aware sorting and accent-insensitive search; deterministic data makes test runs repeatable.
- **Caveats:** 10,000 rows is the browser-mode stress case; bigger datasets belong to practice 14.

### Two processing modes, one query function

- **Question:** Sort/filter/page in the browser or on the server? (agent default, not asked)
- **Decision:** Both, switchable, default browser. One pure, client-safe query function (filter → sort → page) is used by the browser and by the mock API, so both modes must produce identical results. Browser mode downloads the whole dataset once per size and derives the view; server mode requests one page per view (search debounced 300 ms), keeps the previous rows dimmed while loading, aborts superseded requests, and lets only the latest view's response update the grid (run-id guard, the pattern from practice 12).
- **Rationale:** "Where does the work happen" is the senior-level decision for grids; one shared function turns "both modes agree" into something testable.
- **Caveats:** Server mode has no cache of earlier pages; practice 4 and 12 cover caching, and the guide mentions it.

### First paint

- **Question:** How does the grid avoid a loading flash? (agent default, not asked)
- **Decision:** The page (a server component) reads the view from the URL, runs the same query on the server and passes the first page to the client grid. Browser mode then downloads the full dataset in the background; until it arrives, the server-rendered page is shown and further changes show the old rows dimmed with "Loading all N employees…".
- **Rationale:** No spinner on open, no client waterfall; matches the vercel guidance of fetching on the server.
- **Caveats:** None.

### Sorting rules

- **Question:** How many sort keys, what cycle, what order? (agent default, not asked)
- **Decision:** Click cycles ascending → descending → unsorted and replaces other keys; Shift+click adds or cycles a key, up to 3 (adding a 4th replaces the lowest-priority key). Text uses a locale collator with numeric ordering and base sensitivity; ties break by id; empty values last in both directions. Only the primary key carries the screen-reader sort state; the others are in the header's label ("sorted 2nd, descending").
- **Rationale:** Matches common grids (spreadsheets, admin tools); a stable final key means equal rows never jump; ARIA allows one sorted column at a time.
- **Caveats:** No "sort by relevance" when searching.

### Filters

- **Question:** Which filter UI? (agent default, not asked)
- **Decision:** A filter bar above the grid (not inside header cells): global search, Department/Location/Status as single-choice selects with "Any", Role "contains", Salary min/max, Start date from/to, Rating "at least". All combine with AND; each active filter shows a removable chip. Search matches when every word appears in any text column (name, department, role, location, status), case- and accent-insensitive.
- **Rationale:** Filters inside a grid's header row conflict with the grid keyboard pattern (arrow keys vs text editing); a separate bar keeps both simple and works at 360 px.
- **Caveats:** No multi-value enum filters; the guide mentions them.

### Pagination

- **Question:** Page size and page behavior? (agent default, not asked)
- **Decision:** 25 per page by default (10/25/50/100). Sort and filter changes go back to page 1; a page beyond the end is clamped to the last page; changing page size keeps the first visible row in view. PageUp/PageDown in the grid change page.
- **Rationale:** Prevents "Page 7 of 2" and empty pages after filtering.
- **Caveats:** None.

### Selection model

- **Question:** How is selection stored, and what does "select all" mean? (agent default, not asked)
- **Decision:** Selection is by employee id, never by row index. Two shapes: a set of ids, or "all rows matching filter F, except these ids". The header checkbox covers the current page; a banner then offers "Select all Z matching". Changing filters while "all matching" is active converts it to an explicit set in browser mode (all rows are known) and clears it with a notice in server mode. Shift+click applies the clicked row's new state to the range on the current page. "Show selected only" filters to selected ids.
- **Rationale:** Index-based selection breaks on sort/page; storing a rule instead of 10,000 ids is how real grids (Gmail, admin consoles) select rows they never loaded.
- **Caveats:** "Show selected only" with "all matching" shows the matching rows minus exceptions.

### Column resizing

- **Question:** How do columns resize? (agent default, not asked)
- **Decision:** Fixed table layout with explicit pixel widths per column (64–600 px). A handle on each header's right edge resizes with pointer events and pointer capture (mouse, pen, touch); double-click resets. Keyboard: Alt+←/→ on a focused header (10 px; with Shift 50 px), Alt+0 resets. Widths live for the page session.
- **Rationale:** Fixed layout makes widths predictable and fast (no content measuring); pointer capture keeps the drag when the pointer leaves the handle; a resize handle that is its own tab stop would break the grid's single tab stop, so keyboard resizing uses a modifier on the header.
- **Caveats:** No auto-fit to content.

### Keyboard model

- **Question:** Which keyboard pattern? (agent default, not asked)
- **Decision:** WAI-ARIA data grid pattern: one tab stop, roving focus between cells, arrows/Home/End/Ctrl+Home/Ctrl+End, PageUp/PageDown change page. Header cells sort with Enter/Space (Shift adds). Body cells: Space toggles the row, Shift+Space extends. Checkboxes are not separate tab stops: the selection cell is focused and Space toggles it.
- **Rationale:** The grid has 25–100 rows × 9 cells; one tab stop keeps Tab moving through the page; APG documents these keys.
- **Caveats:** No cell editing, so no Enter-to-edit mode.

### Mock latency and failures

- **Question:** How are server conditions controlled? (agent default, not asked)
- **Decision:** Server mode requests take base latency (default 400 ms, 0–2,000) plus up to 50% random extra so successive responses can arrive out of order; failure rate 0–100% returns 500. The dataset download in browser mode uses the same latency but never fails.
- **Rationale:** Random extra makes the stale-response race real; failures are only interesting where retries matter (server mode).
- **Caveats:** None.

### URL state

- **Question:** What goes in the URL? (agent default, not asked)
- **Decision:** Sort, search, filters, page and page size, written with `replaceState` (one history entry for the page). Mode, dataset size, selection and widths are not in the URL.
- **Rationale:** The view is what a link should share; demo settings and selection are personal and session-scoped.
- **Caveats:** None.

### Search in browser mode (was tentative)

- **Question:** Should browser mode debounce or defer search? (agent default, not asked)
- **Decision:** Neither: browser mode filters on every keystroke, synchronously.
- **Rationale:** Measured with 10,000 rows: 8–49 ms from keystroke to the next frame (the slowest is the first keystroke, which builds the folded-text cache); a deferred value would add complexity for no visible gain.
- **Caveats:** Revisit if a mid-range device shows lag.

### Focus restore after rows are replaced

- **Question:** Where does focus go when the focused cell disappears (new page, fewer results, a row leaving "show selected only")? (agent default, not asked; found during verification)
- **Decision:** To the same row/column position, clamped to the rows that exist, but only when focus fell to the page body (never stealing it from another control). A key press inside the grid also counts as "focus is inside", because removing the focused element fires blur in browsers and fires no focus events at all in an unfocused (headless) page.
- **Rationale:** AC-025; the first version relied on focus events only and lost focus on PageDown.
- **Caveats:** None.

## Tentative

- None.

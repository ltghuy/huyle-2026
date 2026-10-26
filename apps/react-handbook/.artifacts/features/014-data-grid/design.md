---
id: "014"
feature: data-grid
created: 2026-10-08
---

# Technical Design: Advanced Data Grid

## Scope

In scope: practice 13 page at `/react-practices/data-grid` (server-rendered
first page from the URL), a framework-free grid controller (view, selection,
browser/server processing, stale guard, stats), one pure query function
shared by browser and mock API, mock API (dataset download + page query), the
grid UI (filter bar, chips, selection bar, keyboard data grid, column
resizing, pager, stats), the guide, and the catalog flip to built.

Out of scope: see spec Out of Scope (virtualization, reorder/pin/hide,
editing, export, persisted widths, libraries).

## Research Summary

No new technology. Patterns verified against the codebase and WAI-ARIA APG:

- APG data grid: `role="grid"` on a `<table>` keeps native table semantics;
  one cell (or the single widget inside it) has `tabIndex=0`, all others
  `-1`; `aria-rowcount`/`aria-rowindex` give positions when only a page of
  rows is in the DOM; `aria-sort` belongs on one column header at a time;
  `aria-multiselectable` + `aria-selected` on rows for selectable rows.
- Pointer capture (`setPointerCapture`) keeps `pointermove` flowing to the
  resize handle when the pointer leaves it; `lostpointercapture` fires on
  cancel, so it is the one place to end a drag. `touch-action: none` on the
  handle stops the browser from scrolling during a touch drag.
- `Intl.Collator("en", { numeric: true, sensitivity: "base" })` is available
  in Node (full ICU) and browsers, so server and browser sort identically.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Practice route | Own route folder, `PracticeFrame` with `explanation` + `demo`, `practiceMetadata` | Serving built practices from `[slug]` | src/app/(playground)/react-practices/debounced-search/page.tsx:1 |
| Reading the URL on the server | `PageProps<"/react-practices/…">`, `await searchParams` | Reading the URL only on the client (loading flash) | src/app/(playground)/react-practices/debounced-search/page.tsx:11 |
| Framework-free engine + `useSyncExternalStore` | Engine class owns logic and async work; React subscribes and forwards events | Logic spread over effects | src/practices/debounced-search/use-search.ts:8 |
| Latest-wins guard | Run id incremented per start; response applied only if current; `AbortController` for savings | Trusting response order | .agents/knowledge.md (feature 013 decision) |
| Mock API | Thin route → zod → service; simulated latency honoring `request.signal` (499 on abort); `jsonError` | Logic in route files | src/app/api/practices/debounced-search/search/route.ts:11 |
| Shared client-safe schema | `*.schema.ts` without `server-only`, imported by UI and API | Importing `server-only` modules from client files | src/server/practices/debounced-search/search.schema.ts:1 |
| Accent-insensitive highlight | Fold per character with an index map | Folding the whole string then slicing | .agents/knowledge.md (feature 003 gotcha) |
| URL sync | `history.replaceState` in an effect | `router.replace` per keystroke | src/practices/debounced-search/use-search.ts:28 |
| Demo controls | Native `select` / `range` inside `DemoControls` | Second component library | src/practices/debounced-search/demo.tsx:156 |
| Guide | `Intro`, `KeyIdeas`, `ReadMore` with the six sections | Free-form notes | src/components/playground/practice-guide.tsx:1 |
| Handlers | Named `handleX`, inline only for one-line calls | Multi-line inline handlers | .claude/rules/05-event-handlers.md |
| Contrast | `text-foreground/75` on muted surfaces | `text-muted-foreground` on `bg-muted` | .agents/knowledge.md (quick 001 gotcha) |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `PracticeFrame` | src/components/playground/practice-frame.tsx:7 | Page shell |
| `DemoControls`, `DemoStage` | src/components/playground/demo-controls.tsx:5, demo-stage.tsx:33 | Controls panel and error-bounded stage |
| Guide blocks | src/components/playground/practice-guide.tsx:9 | Explanation |
| `jsonError`, `parseBody` | src/lib/http.ts:5, :12 | API errors and body validation |
| `Button`, `Input` | src/components/ui/button.tsx, input.tsx | Pager, chips, actions, text inputs |
| Table parts (`TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`) | src/components/ui/table.tsx (added) | Cell styling; **not** the `Table` wrapper, whose `overflow-x-auto` container breaks a sticky header inside our own scroll box |
| `getPractice`, `practiceMetadata` | src/practices/catalog.ts:206, :210 | Metadata and frame |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| Employee | One grid row (new) |
| GridView | What the admin asked to see: sort keys, search, filters, page, page size (new; URL-serializable) |
| Selection | Ids, or "all matching filter F except ids" (new) |
| QueryResult | One page of rows plus totals, the clamped page, and which selected ids match (new) |
| Practice (catalog entry) | `built` flips to true |

#### Employee (new, `grid.schema.ts`)

- `id` (string, `E00001`…), `name` (string), `department` (enum of 8), `role` (string), `location` (enum of 10), `salary` (number, whole dollars), `startDate` (string `YYYY-MM-DD`), `status` (`Active` | `On leave` | `Contractor`), `rating` (1–5 or null)

Employee *i* is generated from *i* only, so the 1,000-row dataset is the
first 1,000 rows of the 10,000-row one (ids stay valid across sizes).

#### GridView (new)

- `sort`: `{ column: ColumnId; dir: "asc" | "desc" }[]` (0–3 keys, first = primary)
- `search`: string
- `filters`: `{ department?, location?, status?, role?, salaryMin?, salaryMax?, startFrom?, startTo?, ratingMin? }`
- `page`: number (1-based), `pageSize`: 10 | 25 | 50 | 100

#### Selection (new, `selection.ts`)

- `{ kind: "ids"; ids: ReadonlySet<string> }`
- `{ kind: "all"; filterKey: string; except: ReadonlySet<string>; total: number }` — `filterKey` is the serialized search + filters it was taken under; `total` the match count then.

#### QueryResult (new)

- `rows` (Employee[] for the page), `total` (matches), `page` (clamped), `pageCount`, `matchedSelectedIds` (string[]: the sent explicit ids that match search + filters)

#### Practice (existing)

- `built` (boolean) -- src/practices/catalog.ts:149 (data-grid entry starts at :144)

### Relationships

Selection references Employee ids; an "all" selection references a GridView's
search + filters by `filterKey`. QueryResult is a pure function of
(Employee[], GridView, selection input, onlySelected).

### API Contracts

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/practices/data-grid/employees` | GET | `?size=1000\|10000&latencyMs=0..5000` | `200 { data: Employee[] }`; `422` invalid params; `499` aborted |
| `/api/practices/data-grid/query` | POST | `{ size, view: GridView, selection?: { kind: "ids", ids: string[] } \| { kind: "all", except: string[] }, onlySelected: boolean, latencyMs, failRate }` | `200 { data: QueryResult & { latencyMs } }`; `400` bad JSON; `422` invalid; `500` simulated failure; `499` aborted |

A POST for a read: the selection can hold thousands of ids, which doesn't fit
a URL; the request has no side effects.

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-001 | Name | none | no | must add (Employee.name) |
| AC-001 | Department | none | no | must add |
| AC-001 | Role | none | no | must add |
| AC-001 | Location | none | no | must add |
| AC-001 | Salary | none | no | must add |
| AC-001 | Start date | none | no | must add |
| AC-001 | Status | none | no | must add |
| AC-001 | Rating | none | no | must add |
| AC-030 | where / time / rows matched / bytes / requests | none | no | must add (controller stats) |

## Decisions

| Decision | Rationale |
|----------|-----------|
| One pure `queryEmployees(rows, view, selection, onlySelected)` in `grid.query.ts` (client-safe, beside the schema) used by the browser and the API | Browser and server mode can't disagree; the equality test is a direct comparison |
| Framework-free `GridController` (class + subscribe/getSnapshot) owns view, selection, mode, dataset, requests, debounce, run id, stats | Same shape as practice 12's engine; async and stale logic testable without React; avoids `setState` in effects (React Compiler lint) |
| The controller keeps the last shown result; a new view sets `pending` until its result is applied | One "keep previous rows dimmed" rule for both modes, including the browser dataset download and mode switches |
| Browser mode: dataset cached per size at module level (promise + abort controller); view changes compute synchronously and time themselves with `performance.now()`; search typing is neither debounced nor deferred (measured 8–49 ms click-to-frame at 10,000 rows) | 10,000 rows filter/sort in a few ms; measured time is what the stats line shows |
| Server mode: search changes wait 300 ms, other changes request immediately; each request aborts the previous one; run-id guard | Debounce only where typing drives requests |
| Selection by id; "all" = filter key + exceptions + total at selection time | Survives sort/page; selects rows never loaded; count stays exact (`total − except.size`) |
| Hidden-by-filters count: browser = exact (selected ids not matching); server = selected ids not in the last response's `matchedSelectedIds` and not on the current page (visible rows match by definition) | No refetch per checkbox click in server mode |
| Server mode refetches on selection change only while "Show selected only" is on | Otherwise selection never changes which rows match |
| Page clamping happens in the query; the controller adopts the returned page | One rule for both modes; URL follows |
| Widths and active cell are React state in the grid UI, not in the controller | Pure presentation; resizing re-renders the `colgroup` only (rows are memoized) |
| `<table role="grid">` with our own scroll box (`relative isolate max-h overflow-auto`), sticky `thead`, `table-layout: fixed` + `<colgroup>` | Native table semantics + APG grid; fixed layout makes widths exact and cheap; `relative` clips the cells' absolutely positioned sr-only text (found in verification: it widened the page at 360 px), `isolate` keeps the sticky header under the app bar |
| Selection cell's native checkbox is the cell's focus target (roving `tabIndex`); other cells are focused themselves | APG: a cell with one widget focuses the widget; native checkbox gives `indeterminate` and correct semantics |
| Keyboard resize: Alt+←/→ (Shift: 50 px), Alt+0 reset on a header | Keeps one tab stop |
| Filter bar outside the grid; native `select`, `Input`, `type="number"`, `type="date"` | No conflict with grid arrow keys; consistent with other practices' controls |
| Dates stay `YYYY-MM-DD` strings (compare as strings); formatted with `timeZone: "UTC"` | No off-by-one day across zones |
| URL params: `sort=salary.desc,department.asc`, `q`, `dept`, `loc`, `status`, `role`, `salMin`, `salMax`, `from`, `to`, `rating`, `page`, `per`; parsed with zod `.catch()` per field | Invalid values fall back per field instead of rejecting the link |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Grid schema | src/server/practices/data-grid/grid.schema.ts | new | Employee, columns config, enums, GridView + zod (URL, API body), defaults, `parseViewParams`, `viewToSearchParams`, `filterKey` |
| Grid query | src/server/practices/data-grid/grid.query.ts | new | `foldText`, `searchTerms`, `filterKey`, `compareBy`, `queryEmployees`, `matchingIds`, `filterErrors`, `highlightRanges` (client-safe, pure) |
| Employee data | src/server/practices/data-grid/employees.data.ts | new | `server-only`; deterministic generator, cached per size |
| Grid service | src/server/practices/data-grid/grid.service.ts | new | `server-only`; simulated latency, abortable delay, `runQuery(size, body)` |
| Employees route | src/app/api/practices/data-grid/employees/route.ts | new | GET full dataset |
| Query route | src/app/api/practices/data-grid/query/route.ts | new | POST one page |
| Selection model | src/practices/data-grid/selection.ts | new | Pure: `isSelected`, `toggle`, `setRange`, `setPage`, `selectAll`, `count`, `toExplicit`, `toRequest` |
| Grid API client | src/practices/data-grid/grid-api.ts | new | `fetchDataset`, `fetchQuery` returning data + bytes + ms |
| Grid controller | src/practices/data-grid/grid-controller.ts | new | State machine described in Decisions; actions for every UI intent |
| Hooks | src/practices/data-grid/use-grid.ts | new | `useGridController` (create, start/stop, snapshot), URL sync effect |
| Demo | src/practices/data-grid/demo.tsx | new | Controls (mode, size, latency, failure) + stage layout |
| Filter bar | src/practices/data-grid/filter-bar.tsx | new | Search, filter fields with validation, chips, clear all, match count |
| Selection bar | src/practices/data-grid/selection-bar.tsx | new | "N selected", hidden count, select-all-matching banner, show selected only, clear, notices |
| Data grid | src/practices/data-grid/data-grid.tsx | new | Table, header sort, cells, keyboard, roving focus, live region, empty/updating states |
| Column resizer | src/practices/data-grid/column-resizer.tsx | new | Pointer-capture drag handle |
| Pager | src/practices/data-grid/pager.tsx | new | Range text, page size, first/prev/page input/next/last |
| Stats line | src/practices/data-grid/grid-stats.tsx | new | Status (updating/loading/error + Retry) and stats |
| Highlight | src/practices/searchable-accordion/highlight.tsx | reuse | Renders `highlightRanges` (practice 2's `<Highlight>`) |
| Formatting | src/practices/data-grid/format.ts | new | Money, counts, UTC calendar days, bytes, ms in one locale (server and client render the same text) |
| Explanation | src/practices/data-grid/explanation.tsx | new | Guide |
| Page | src/app/(playground)/react-practices/data-grid/page.tsx | new | Parse URL → view; server query → initial result; frame |
| Catalog | src/practices/catalog.ts | modify | `built: true` |
| Table parts | src/components/ui/table.tsx | new (CLI) | Cell styling |

## Visual Design Considerations

From `ui-ux-pro-max` (dense admin data UI; shadcn stack), mapped to the
existing neutral tokens:

- Layout (top → bottom inside the stage): filter bar (search full width;
  fields in a `sm:grid-cols-2 lg:grid-cols-4` grid; every field is one label
  + one control row so controls align across a row: ranges are two inputs
  joined by a dash with screen-reader labels "… min"/"… from", Start date
  spans two columns from `sm` and comes before Salary so rows pack evenly) → chips row with "Z of T
  match" and Clear all → selection bar (only when something is selected) →
  status line → grid box → pager → stats line + "Keyboard" help
  (`<details>`) + Reset widths.
- Grid box: `rounded-lg border`, `max-h-[36rem] overflow-auto` (both axes;
  page never scrolls sideways), sticky header `bg-muted` with
  `text-foreground` labels, `tabular-nums` right-aligned numbers, row
  `hover:bg-muted/50`, selected row `bg-primary/5` plus checked box (state is
  never colour-only), focused cell `outline-2 -outline-offset-2 outline-ring`.
- Status shown as text with a small dot; rating as "4 / 5" text; empty
  rating "—" with an sr-only "no rating".
- Updating: rows `opacity-60` + "Updating…" with spinner icon
  (`motion-safe:animate-spin`), table `aria-busy`.
- Empty state inside the grid body (one full-width cell) with Clear filters.
- Error: `role="alert"` inline line above the grid with Retry.
- Touch: resize handle hit area 16 px wide over a 2 px visual line.
- Icons from lucide: ArrowUp/ArrowDown/ArrowUpDown (sort), ChevronsLeft,
  ChevronLeft, ChevronRight, ChevronsRight (pager), Search, X (chips),
  Loader2, TriangleAlert.

## Data Flow

```mermaid
sequenceDiagram
  participant Page as page.tsx (server)
  participant UI as Grid UI
  participant C as GridController
  participant Q as queryEmployees
  participant API as /api/practices/data-grid/*
  Page->>Q: view from URL, 1,000 rows
  Q-->>Page: first page
  Page->>UI: initialView, initialResult
  UI->>C: create(initial); start()
  C->>API: GET employees (browser mode, background)
  UI->>C: sort / filter / page / select
  alt browser mode, dataset loaded
    C->>Q: queryEmployees(dataset, view, selection)
    Q-->>C: result (+ ms)
  else browser mode, dataset loading
    C-->>UI: previous rows, pending "Loading all N…"
  else server mode
    C->>API: POST query (debounced for search, aborts previous, run id)
    API->>Q: same function
    API-->>C: result
    C->>C: apply only if run id is current
  end
  C-->>UI: snapshot (useSyncExternalStore)
  UI->>UI: replaceState(view params)
```

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | Page + grid | page.tsx, data-grid.tsx, employees.data.ts | Done |
| AC-002, AC-003 | Controller `sort`, header | grid-controller.ts, data-grid.tsx | Done |
| AC-004 | `compareBy` | grid.query.ts | Done |
| AC-005 | Pager, controller `setPage`/`setPageSize` | pager.tsx, grid-controller.ts | Done |
| AC-006 | Query clamping, controller resets | grid.query.ts, grid-controller.ts | Done |
| AC-007 | `queryEmployees`, `highlightRanges`, practice 2 `Highlight` | grid.query.ts, data-grid.tsx | Done |
| AC-008, AC-011 | Filter bar, `filterErrors` | filter-bar.tsx, grid.query.ts | Done |
| AC-009, AC-010 | Chips, empty state | filter-bar.tsx, data-grid.tsx | Done |
| AC-012–AC-017 | Selection model, selection bar, grid checkboxes | selection.ts, selection-bar.tsx, data-grid.tsx, grid-controller.ts | Done |
| AC-018–AC-021 | Resizer, widths, truncation | column-resizer.tsx, data-grid.tsx | Done |
| AC-022–AC-025 | Keyboard, roving focus, ARIA, live region | data-grid.tsx | Done |
| AC-026–AC-031 | Controller modes, API, stats | grid-controller.ts, grid-api.ts, routes, grid-stats.tsx, demo.tsx | Done |
| AC-032 | URL parse/serialize, sync | grid.schema.ts, use-grid.ts, page.tsx | Done |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | None configured; scripted checks run with `node --experimental-strip-types` over the pure modules, and Puppeteer (MCP) against `pnpm build && pnpm start` on a spare port |
| Command | `pnpm typecheck && pnpm lint && pnpm build` + scripts in the session scratchpad |
| Location | Scratchpad (not committed), as in features 008–013 |

### Reference Tests

| File | What It Tests |
|------|---------------|
| .artifacts/features/013-debounced-search/audit.md | How earlier practices recorded scripted and browser evidence |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| Query parity | scratchpad/grid-parity.mjs | 300 random views × 2 sizes: local `queryEmployees` vs POST `/query` identical rows/totals |
| Sorting | scratchpad (same) | Stability, empty ratings last both directions, numeric-in-text, accents |
| Selection | scratchpad | toggle/range/page/all/except counts; conversion on filter change |
| Stale guard | Puppeteer | 1,000 ms latency, fast sorts ×20: shown rows match header sort |
| Keyboard + a11y | Puppeteer | Arrow/Home/End/PageDown, Space/Shift+Space, Alt+→ resize; axe-like checks both themes; 360 px width |

## Considerations

### Error Handling

- Server mode failures keep the previous rows and show Retry (AC-029); aborts
  are silent; a dataset download failure (network) shows an error with Retry
  in browser mode.
- Invalid URL values fall back per field; invalid API bodies return 422.

### Security

- Mock API is unauthenticated like every practice API; body sizes are bounded
  by zod (ids array ≤ 10,000, strings ≤ 100 chars).

## Open Questions

- None.

---
id: "014"
feature: data-grid
created: 2026-10-08
---

# Tasks: Advanced Data Grid

## Summary

Total: 10 | Completed: 10 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --┐
   └---> T004 ----------┼--> T005 --> T006 --> T007 --> T008 --> T009 --> T010
```

## Quality Gates

Run after each task or batch:

- pnpm lint
- pnpm typecheck
- pnpm build (after T003 and at the end)

## Tasks

### Shared query layer

- [x] T001 Create the grid schema: Employee, columns, enums, GridView with zod for URL params and the API body, defaults, `parseViewParams`, `viewToSearchParams`, `filterKey`
  - **Done when:** typecheck passes; a URL record with junk values parses to defaults per field, and serialize → parse round-trips a full view. -- VERIFIED

- [x] T002 [B:T001] Build the pure query: text folding, filter matching (search words over text columns + column filters, invalid ranges ignored), `filterErrors`, multi-key stable comparison (collator, empty last), paging with clamping, selection input + only-selected, `matchedSelectedIds`, `highlightRanges`
  - **Done when:** a scratch script checks: stability under equal keys, empty ratings last both directions, "Engineer 2" < "Engineer 10", "José" found by "jose", page 99 → last page, min > max ignored. -- VERIFIED

### Mock API

- [x] T003 [B:T002] Add the deterministic employee generator (row *i* depends only on *i*), the service (latency + abortable delay + `runQuery`), and the two routes
  - **Done when:** GET employees returns 1,000 / 10,000 rows with the first 1,000 identical; POST query returns a page; 422 on bad body, 400 on bad JSON, 500 at failRate 1; build passes. -- VERIFIED

### Client logic

- [x] T004 [B:T001] Write the selection model (ids / all-except; toggle, range, page, select all, count, isSelected, explicit conversion, request shape, prune to size)
  - **Done when:** a scratch script covers: toggle on/off, range from anchor, page tri-state, all − except count, conversion to ids under a new filter. -- VERIFIED

- [x] T005 [B:T002,T003,T004] Build `grid-api.ts` and `GridController` (view actions with page reset rules, page-size anchor, mode/size switches, browser dataset cache + download, server requests with debounce/abort/run id, pending/error/retry, stats, selection actions incl. notices) and `use-grid.ts` (controller lifecycle + URL sync)
  - **Done when:** typecheck/lint pass; a scratch script drives the controller with a fake fetcher: out-of-order responses never applied, search debounced in server mode only, retry re-requests the current view. -- VERIFIED

### UI

- [x] T006 [B:T005] Build the page route (server parse + first page), Demo layout with controls, filter bar (fields, validation, chips, clear, counts), selection bar, pager, stats line; flip the catalog entry to built
  - **Done when:** `/react-practices/data-grid` renders 25 rows on first paint (view source), filters/pager/selection bar work by mouse in both modes. -- VERIFIED

- [x] T007 [B:T006] Build the data grid: table with colgroup widths, sticky header, sort headers with icons/priority/aria-sort, cells (truncation + title, highlight, formatting), checkbox column with header tri-state and Shift-range, empty and updating states, column resizer (pointer capture, double-click reset), keyboard model (roving focus, arrows/Home/End/Ctrl+Home/End/PageUp/PageDown, Enter/Space sort, Space/Shift+Space select, Alt+arrows/Alt+0 resize), focus clamping, live region announcements
  - **Done when:** every interaction in AC-012, AC-014, AC-018–AC-025 works by mouse and keyboard in a browser. -- VERIFIED

### Guide and verification

- [x] T008 [B:T007] Write the explanation guide (Intro, Key ideas, Where you'd use it, How we built it, Best practices, Try it with the demo controls, Trade-offs and limits)
  - **Done when:** every topic in the spec Notes is covered and every demo control has a row. -- VERIFIED

- [x] T009 [B:T008] Verify: parity script (300 views × 2 sizes, local vs API), stale-guard runs, keyboard-only pass, accessibility checks in both themes, 360 px width, payload/time numbers; mark ACs
  - **Done when:** all ACs proven and marked `[x]` in spec.md, or failures fixed. -- VERIFIED

- [x] T010 [B:T009] Record knowledge (cross-feature decisions, gotchas), update feature 001 references if needed, set status `to-review`, then audit Goals and Success Criteria
  - **Done when:** audit.md written, spec status `done`. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T003, T006, T007 |
| AC-002, AC-003 | T005, T007 |
| AC-004 | T002 |
| AC-005, AC-006 | T002, T005, T006 |
| AC-007 | T002, T006, T007 |
| AC-008–AC-011 | T002, T006, T007 |
| AC-012–AC-017 | T004, T005, T006, T007 |
| AC-018–AC-021 | T007 |
| AC-022–AC-025 | T007 |
| AC-026–AC-031 | T003, T005, T006 |
| AC-032 | T001, T005, T006 |

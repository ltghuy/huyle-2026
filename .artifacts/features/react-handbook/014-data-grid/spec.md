---
id: "014"
feature: data-grid
type: greenfield
scope: complex
status: done
branch: main
created: 2026-10-08
---

# Feature: Advanced Data Grid

## Overview

Practice 13 of the React Practices section. Admin screens live on data
grids, and the "simple table" quickly turns into the hardest component on
the page: several columns sorted at once, filters that combine, pages that
must stay valid when the data shrinks, columns the user can resize, and a
selection that has to survive sorting, filtering and paging, including
"select all 2,000 matching rows" that the browser never loaded. Built
naively, it re-sorts on every render, loses the selection on page change,
lets a slow response overwrite a newer one, and is unusable from the
keyboard.

The demo is an employee directory (1,000 or 10,000 generated employees)
served by the project's own mock API. The same grid runs in two modes the
learner can switch between: **in the browser** (all rows downloaded once,
then sorted, filtered and paged locally) and **on the server** (each change
asks the server for one page), with server latency and failures under the
learner's control, so the trade-off between the two is visible. Cross-
practice rules from feature 001 apply: the grid logic is hand-built (no grid
or table library, no ready-made data table), the page has an explanation
guide, demo controls and a live demo.

## Goals

- [x] The learner can sort by several columns, combine filters and page through the result, and both processing modes always show the same rows for the same view.
- [x] Row selection survives sorting, filtering and paging, and "select all matching" works for rows that were never loaded.
- [x] Columns can be resized with the mouse, touch or keyboard.
- [x] Server mode never shows rows for an older view, and the learner can see the cost difference between the two modes (payload, time).
- [x] The grid is fully usable with the keyboard and a screen reader.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Virtualized rows or columns | Practice 14 (Large Dataset Performance) covers rendering many rows; this grid pages |
| Column reordering, pinning/freezing, hiding | Separate interactions; would double the header logic without teaching the core |
| Inline cell editing, row grouping, aggregation, tree rows | Each is its own pattern |
| Exporting or bulk actions on the selection | The practice is the selection model; the count and a "show selected" view prove it |
| Persisting column widths across reloads | Widths live for the page session; the guide explains how to persist them |
| A grid/table library or the UI kit's data table | The point is to build the pattern by hand |
| Infinite scroll instead of pages | Practice 3 covers it |

## User Stories

### P1: Browse a paged, sortable grid

- As an HR admin, I want to sort the employee list by any column and move through pages so that I can find people quickly.
- **Why P1:** The core grid.
- **Independent Test:** Open the practice: page 1 of 1,000 employees shows 25 rows. Click "Salary" twice: highest salary first. Shift+click "Department": rows are ordered by salary, then department, with priority numbers 1 and 2 on the headers. Go to page 3: "Showing 51–75 of 1,000".

**Acceptance Criteria:**

- [x] AC-001: WHEN the practice opens THEN system SHALL show the first page (25 rows) of employees with columns Name, Department, Role, Location, Salary, Start date, Status and Rating, already filled in on the first paint (no loading flash), plus a selection column.
- [x] AC-002: WHEN the admin activates a column header THEN system SHALL cycle that column through ascending → descending → unsorted and replace any other sort; the header SHALL show the direction with an icon and the screen-reader state.
- [x] AC-003: WHEN the admin Shift+activates a header THEN system SHALL add that column as the next sort key (or cycle it if already sorted) keeping the others, up to 3 keys, showing each key's priority number on its header.
- [x] AC-004: WHEN rows are sorted THEN system SHALL compare text in a case- and accent-aware alphabetical order with numbers inside text in numeric order, numbers numerically, dates chronologically, and fall back to the employee id so equal rows never swap between renders; empty values SHALL sort last in both directions.
- [x] AC-005: WHEN the admin changes page (first, previous, next, last, or typing a page number) or page size (10, 25, 50, 100) THEN system SHALL show that page with "Showing X–Y of Z" and "Page N of M"; changing page size SHALL keep the first visible row on the new page.
- [x] AC-006: WHEN sort or filters change THEN system SHALL go back to page 1; WHEN the current page no longer exists THEN system SHALL show the last existing page.

### P1: Filter rows

- As an HR admin, I want to search all columns and filter specific ones so that I can narrow the list to the people I need.
- **Why P1:** Sorting a thousand rows without filtering is not usable.
- **Independent Test:** Type "jose" in search: rows with "José" appear, the match is highlighted. Set Department = Engineering and Salary min 150,000: the count updates and a filter chip appears for each; "Clear all" restores 1,000.

**Acceptance Criteria:**

- [x] AC-007: WHEN the admin types in the search box THEN system SHALL keep rows where any text column contains every typed word, ignoring case, accents and extra spaces, and highlight matched text in the visible cells.
- [x] AC-008: WHEN the admin sets column filters (Department, Location, Status: one of the values or any; Role: contains text; Salary: min and/or max; Start date: from and/or to; Rating: at least N) THEN system SHALL keep only rows matching all filters and the search together.
- [x] AC-009: WHILE any filter or search is active THEN system SHALL show one removable chip per active filter, a "Clear all" action, and "Z of T employees match".
- [x] AC-010: WHEN no rows match THEN system SHALL show "No employees match these filters" inside the grid with a "Clear filters" action, and the pager SHALL show 0 results.
- [x] AC-011: WHEN a range filter is impossible (min above max, from after to) THEN system SHALL mark the field invalid with a message and ignore that filter until fixed.

### P1: Select rows across pages

- As an HR admin, I want to select employees on different pages and with different filters so that I can act on a group of people.
- **Why P1:** Selection that breaks on page change is the classic data grid bug.
- **Independent Test:** Select 2 rows on page 1, go to page 2 and select 1 more: "3 selected". Sort by Name and filter to Engineering: still "3 selected", with "1 selected row hidden by filters" if one doesn't match. Tick the header checkbox, then "Select all 214 matching": "214 selected", and unticking one row gives "213 selected".

**Acceptance Criteria:**

- [x] AC-012: WHEN the admin ticks a row's checkbox (or presses Space on the row) THEN system SHALL toggle that row's selection and show it as selected (visually and to screen readers); WHEN the admin Shift+clicks another row's checkbox THEN system SHALL set every row between the two on the current page to the clicked row's new state.
- [x] AC-013: WHEN sorting, filtering or paging changes THEN system SHALL keep the selection as is and show "N selected", and how many selected rows the current filters hide.
- [x] AC-014: WHEN the admin ticks the header checkbox THEN system SHALL select every row on the current page (unticking clears them); the header checkbox SHALL show checked, unchecked or mixed for the current page.
- [x] AC-015: WHEN every row on the page is selected and more rows match THEN system SHALL offer "Select all Z matching employees"; WHEN chosen THEN the count SHALL become Z, rows on any page SHALL show selected, and deselecting a row SHALL subtract it, without downloading every matching row.
- [x] AC-016: WHEN filters or search change while "all matching" is selected THEN system SHALL turn it into the explicit set of rows it covered (browser mode) or clear it with a visible notice (server mode, because the server's matching set changed).
- [x] AC-017: WHEN the admin turns on "Show selected only" THEN system SHALL list just the selected rows (with the current sort), and "Clear selection" SHALL deselect everything.

### P1: Resize columns

- As an HR admin, I want to widen or narrow columns so that long names and roles fit.
- **Why P1:** Named in the practice; fixed widths truncate real data.
- **Independent Test:** Drag the edge of the Role header right by ~100 px: the column widens and the grid scrolls horizontally if needed. Focus a header, press Alt+→ three times: it widens by 30 px. Double-click the edge: the default width returns.

**Acceptance Criteria:**

- [x] AC-018: WHEN the admin drags a header's right edge with mouse, pen or touch THEN system SHALL resize that column live, between 64 px and 600 px, without selecting text or triggering a sort, and other columns SHALL keep their widths (the grid scrolls horizontally instead of squeezing).
- [x] AC-019: WHEN a header is focused and the admin presses Alt+→ / Alt+← THEN system SHALL widen / narrow it by 10 px (Alt+Shift: 50 px) within the same limits and announce the new width.
- [x] AC-020: WHEN the admin double-clicks a resize edge or presses Alt+0 on a header THEN system SHALL restore that column's default width; "Reset widths" SHALL restore all.
- [x] AC-021: WHILE cell text is wider than its column THEN system SHALL truncate it with an ellipsis and expose the full text on hover and to screen readers.

### P1: Keyboard and screen-reader grid

- As a keyboard or screen-reader user, I want to move through cells and operate the grid without a mouse so that the directory is accessible.
- **Why P1:** A grid that only works with a mouse is broken.

**Acceptance Criteria:**

- [x] AC-022: WHEN focus enters the grid THEN system SHALL put it on one cell (the last focused one, else the first header), with a single tab stop for the whole grid; arrow keys SHALL move between cells, Home/End to the first/last cell of the row, Ctrl+Home/Ctrl+End to the first/last cell of the page, PageDown/PageUp to the next/previous page keeping the column.
- [x] AC-023: WHEN a header cell is focused THEN Enter or Space SHALL sort as a click does (with Shift: add a sort key); WHEN a body row's cell is focused THEN Space SHALL toggle that row's selection and Shift+Space SHALL extend the selection from the last toggled row.
- [x] AC-024: WHILE the grid is shown THEN it SHALL expose the total row and column counts, each row's position in the whole result, the sorted column's direction, which rows are selected and that several can be; changes in result count, sort, page, and selection SHALL be announced politely.
- [x] AC-025: WHEN the page or result changes and the focused cell no longer exists THEN focus SHALL move to the nearest existing cell in the same column, never to the page body.

### P2: Browser vs server processing

- As a learner, I want to switch where sorting, filtering and paging happen so that I understand when to do it in the browser and when on the server.
- **Why P2:** The comparison is the senior-level lesson; the grid works without it.
- **Independent Test:** Switch to server mode with 10,000 rows and 800 ms latency: each sort sends one small request; previous rows stay visible but dimmed with "Updating…". Switch to browser mode: the first view downloads all 10,000 rows once (size shown), then sorting is instant with 0 requests.

**Acceptance Criteria:**

- [x] AC-026: WHEN the learner picks browser or server processing (default: browser) or the dataset size (1,000 or 10,000) THEN the grid SHALL keep the current view (sort, filters, page, selection where possible) and continue in that mode; browser mode SHALL download the dataset once per size and reuse it.
- [x] AC-027: WHEN the view changes in server mode THEN system SHALL request only that page from the server; typing in search SHALL wait for a 300 ms pause; previous rows SHALL stay visible but dimmed with "Updating…" and the grid marked busy.
- [x] AC-028: WHEN a server response arrives for a view that is no longer the latest THEN system SHALL NOT show it, and SHALL cancel superseded requests.
- [x] AC-029: WHEN a server request fails THEN system SHALL keep the previous rows, show an inline error with Retry, and Retry SHALL request the current view again.
- [x] AC-030: WHILE the demo is shown THEN a stats line SHALL show, for the last view change: where it ran, time taken, rows matched, bytes downloaded, and the total requests sent this session.
- [x] AC-031: WHEN the learner changes server latency (0–2,000 ms, default 400) or failure rate (0–100%) THEN the next request SHALL use them; WHEN browser mode is downloading the dataset THEN the grid SHALL show its rows dimmed with "Loading all N employees…" and apply the view once the download finishes.

### P3: Shareable view

- As an HR admin, I want the view in the address so that a reload or a shared link shows the same grid.
- **Why P3:** Expected in real admin screens; not core to the practice.

**Acceptance Criteria:**

- [x] AC-032: WHEN sort, search, filters, page or page size change THEN system SHALL mirror them in the URL without adding a history entry per change; WHEN the page opens with them THEN the grid SHALL render that view on the first paint; invalid values SHALL fall back to defaults.

## Edge Cases

- WHEN the search box holds only spaces or characters like `%`, `*`, `(` THEN they SHALL be treated literally and not break either mode.
- WHEN an employee has no rating (new hires) THEN the cell SHALL show "—" (announced as "no rating"), sort last, and fail any rating filter.
- WHEN a date filter is half filled (only from, or only to) THEN it SHALL apply as an open-ended range; dates SHALL never shift by a day between time zones.
- WHEN the page number typed is not a number, below 1 or above the last page THEN system SHALL clamp it to the nearest valid page.
- WHEN a resize drag leaves the window or is cancelled by the system THEN the column SHALL keep the last width and the drag SHALL end.
- WHEN the admin Shift+clicks a checkbox with no earlier click on this page THEN it SHALL behave as a normal click.
- WHEN "show selected only" is on and the last selected row is deselected THEN the grid SHALL show the empty state with "Show all rows".
- WHEN the learner switches mode or size while a request or download is pending THEN it SHALL be cancelled and never shown.
- WHEN the dataset size changes THEN selections of ids that don't exist in the new dataset SHALL be dropped.
- WHEN the demo is left while a request is pending THEN it SHALL be aborted and timers cleared.

## Success Criteria

- [x] For 300 random views (sort keys, filters, search, page, page size) over both dataset sizes, browser and server mode return identical rows and totals.
- [x] Changing the view in browser mode with 10,000 rows updates the grid in under 100 ms with 0 network requests; server mode downloads under 20 KB per view.
- [x] With 1,000 ms random latency and fast successive sorts, 0 cases across 20 runs where the grid shows rows that don't match the current header sort indicators.
- [x] Every grid interaction (move, sort, multi-sort, resize, select, select range, page) works with the keyboard alone.
- [x] Zero serious or critical accessibility issues in both themes, and no horizontal page scrolling at 360 px width (the grid scrolls inside its own box).

## Open Questions

- None. Defaults chosen without asking are recorded in [decisions.md](decisions.md).

## Notes

- The explanation guide should cover: deriving the view (filter → sort → page) instead of storing it, stable multi-key sorting and locale-aware comparison, why page resets and clamping matter, selection by id vs by index, "select all matching" as a rule with exceptions instead of a list of ids, column sizing with fixed table layout and pointer capture, the data grid keyboard pattern (one tab stop, moving focus between cells), and when to process in the browser vs on the server (dataset size, payload, latency, consistency).

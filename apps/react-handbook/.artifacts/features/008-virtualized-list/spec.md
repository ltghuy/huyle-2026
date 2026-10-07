---
id: "008"
feature: virtualized-list
type: greenfield
scope: complex
status: done
branch: main
created: 2026-10-07
---

# Feature: Virtualized Large Lists

## Overview

Practice 7 of the playground. The learner wants to build, from scratch, the
technique that lets a list of 100,000 items scroll as smoothly as a list of
20: only the rows near the visible area exist on the page, and a spacer of
the right total height gives the scrollbar its true size. It's a good
exercise because the easy version (every row the same height) hides the
real difficulties: rows whose heights are only known once drawn, keeping
the view steady while estimates are corrected, jumping straight to a row
far below, keyboard and screen reader access to rows that aren't on the
page, and filtering or sorting without losing the reader's place.

The list shows generated support tickets of varying length, built in the
browser from a fixed seed (1,000 to 100,000 of them). It scrolls inside its
own box on the practice page. A naive mode renders every row so the cost
of not virtualizing is visible side by side with live numbers.
Cross-practice rules from feature 001 apply (core logic hand-built,
explanation guide + demo controls).

## Goals

- [x] A 100,000-row list with rows of different heights scrolls without dropped frames or blank gaps, while the page never holds more than the visible rows plus a small, configurable margin.
- [x] The view never jumps on its own: correcting estimated heights, resizing the box, filtering, sorting or switching modes keeps the reader's row where it was (or explains why it can't).
- [x] Keyboard and screen reader users can move through, jump to and select any of the 100,000 rows and know where they are in the list.
- [x] The learner can see the difference: live numbers show rows on the page and render time for naive vs virtualized rendering, and a debug view shows the rendered window.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Loading rows from the server in ranges as you scroll | Data is generated in the browser; paging from a server is practice 3 (Infinite Scroll) |
| Scrolling the whole page instead of an inner box | The inner box was chosen; window scrolling is noted as a trade-off in the guide |
| More than 100,000 rows (beyond browser maximum element heights) | Needs scroll-height scaling; noted as a limit in the guide |
| Virtualizing columns / horizontal scrolling or grids | Practice 13 (Advanced Data Grid) |
| Selecting several rows at once | One selected row is enough to practice focus and selection |
| Restoring scroll position after leaving the practice | Practice 3 covers restoration |
| Editing, deleting or reordering rows | The list is read-only |

## User Stories

### P1: Scroll a huge list smoothly

- As a learner, I want a 100,000-row list to scroll smoothly while only the rows near the view are on the page so that I can see virtualization working.
- **Why P1:** This is the practice.
- **Independent Test:** Set 100,000 rows, drag the scrollbar from top to bottom and fling-scroll in the middle; confirm the scrollbar has the full list's size, rows are always present in the visible area (no blank gaps after scrolling stops), and the "rows on page" number stays small.

**Acceptance Criteria:**

- [x] AC-001: WHEN the practice opens THEN system SHALL show the generated list (default 10,000 rows) in a fixed-height, independently scrolling box whose scroll range reflects the whole list.
- [x] AC-002: WHILE the list is virtualized THEN system SHALL keep on the page only the rows that intersect the visible area plus the overscan rows above and below (default 5 each), plus the active row if it is outside that range.
- [x] AC-003: WHEN the reader scrolls (wheel, touch, keyboard, or dragging the scrollbar to any point) THEN system SHALL show the rows for the new position without blank areas once scrolling stops.
- [x] AC-004: WHEN a row has not been drawn yet THEN system SHALL use an estimated height for it, and WHEN it is drawn THEN system SHALL use its real height from then on.
- [x] AC-005: WHEN a drawn row's real height differs from its estimate and the row is above the first visible row THEN system SHALL adjust the scroll position so the visible content stays within 1 px of where it was.
- [x] AC-006: WHEN the box changes width (window resize, rotation) THEN system SHALL re-measure rows whose height changed and keep the first visible row in place.
- [x] AC-007: WHEN the learner changes the row count (1,000 · 10,000 · 20,000 · 50,000 · 100,000) THEN system SHALL rebuild the list from the same seed (the same row number always has the same content) and return to the top.

### P1: Keyboard, selection and screen readers

- As a keyboard or screen reader user, I want to move through the rows, select one, and hear where I am so that a virtualized list works for me like a normal list.
- **Why P1:** Removing rows from the page easily breaks keyboard focus and screen reader position; the practice must show the fix.
- **Independent Test:** Tab into the list, press Down 5 times, End, then Up; confirm the focused row is always visible and announced with its position ("Ticket #99,999, 99,999 of 100,000"); press Enter and confirm the selected ticket is shown below the list; scroll far away with the mouse, press Down, and confirm focus continues from the active row.

**Acceptance Criteria:**

- [x] AC-008: WHEN the list is shown THEN system SHALL expose it as a single-select list box labelled "Tickets", each row an option announcing its title and its position in the whole current list (e.g. "12 of 100,000").
- [x] AC-009: WHEN focus enters the list THEN system SHALL make the last active row active (the first row initially) and scroll it into view.
- [x] AC-010: WHEN the list has focus and the user presses Down/Up, Page Down/Page Up, Home or End THEN system SHALL move the active row by one, by one box height, or to the first or last row, scrolling only as far as needed to show it fully.
- [x] AC-011: WHEN the user presses Enter or Space, or clicks a row THEN system SHALL select that row, mark it selected, and show its full details in a panel beside or below the list.
- [x] AC-012: WHEN the active row is scrolled out of view by mouse or touch THEN system SHALL keep it on the page so focus is never lost, and the next arrow key SHALL continue from it.
- [x] AC-013: WHEN a row is active or selected THEN system SHALL show a visible focus or selection style with at least 3:1 contrast in both themes.

### P1: Naive vs virtualized

- As a learner, I want to switch between rendering every row and rendering only the visible ones, with live numbers, so that I can measure what virtualization saves.
- **Why P1:** Without the comparison the benefit is invisible.
- **Independent Test:** At 10,000 rows, switch to naive: the "rows on page" number becomes 10,000 and the render time jumps; switch back: both drop and the top visible row stays the same.

**Acceptance Criteria:**

- [x] AC-014: WHEN the learner switches to naive mode THEN system SHALL render every row of the current list in the same box, with the same look, selection and keyboard behavior.
- [x] AC-015: WHILE the list is shown THEN system SHALL display live numbers: rows on the page, rows in the list, the visible row range (e.g. "Rows 1,204–1,231"), and the time of the last render.
- [x] AC-016: WHEN the row count is above 20,000 THEN system SHALL disable naive mode with a short visible reason, and WHEN the row count is raised above 20,000 while in naive mode THEN system SHALL switch back to virtualized and say so.
- [x] AC-017: WHEN the learner switches modes THEN system SHALL keep the first visible row at the top of the box.

### P2: Jump to a row

- As a user, I want to type a row number and land on it so that I can reach row 87,000 without scrolling.
- **Why P2:** Shows that positions far ahead can be found from estimates and then corrected; the list works without it.

**Acceptance Criteria:**

- [x] AC-018: WHEN the user enters a row number (1 to the rows in the current list) and confirms THEN system SHALL scroll so that row's top is at the top of the box (or as close as the end of the list allows), make it active, and move focus to the list.
- [x] AC-019: WHEN rows above the target are corrected from estimated to real heights during or after the jump THEN system SHALL still finish with the target row's top within 1 px of the box top.
- [x] AC-020: WHEN the number is empty, not a whole number, or out of range THEN system SHALL not scroll and SHALL show the valid range next to the field.

### P2: Filter and sort

- As a user, I want to search and sort the whole list so that I can find tickets, and I want to keep my place when I do.
- **Why P2:** Recomputing the window over a changing list is a common real requirement.

**Acceptance Criteria:**

- [x] AC-021: WHEN the user types in the filter field THEN system SHALL show only tickets whose title or text contains the query (case- and accent-insensitive), keep typing responsive at 100,000 rows, and show "N of M tickets".
- [x] AC-022: WHEN the user picks a sort (newest, oldest, priority, title A–Z) THEN system SHALL reorder the whole list.
- [x] AC-023: WHEN the filter or sort changes and the selected row (or else the active row) is still in the list THEN system SHALL keep that row in view at the same distance from the top; otherwise it SHALL return to the top.
- [x] AC-024: WHEN the filter matches nothing THEN system SHALL show an empty state with a "Clear filter" action.
- [x] AC-025: WHEN the number of matching tickets changes THEN system SHALL announce it politely ("1,234 tickets match").

### P3: Overscan and debug view

- As a learner, I want to tune the overscan and see the rendered window so that I understand the trade-off between blank flashes and work per frame.
- **Why P3:** A teaching aid on top of the working list.

**Acceptance Criteria:**

- [x] AC-026: WHEN the learner changes overscan (0–20 rows) THEN system SHALL apply it to the next frame and update the "rows on page" number.
- [x] AC-027: WHEN the debug view is on THEN system SHALL outline each rendered row, label it with its row number and whether its height is estimated or measured, tint overscan rows differently from visible rows, and show how many rows have been measured.
- [x] AC-028: WHEN the learner changes the estimated row height (40–200 px, default 96 px) THEN system SHALL use it for rows not yet measured, so the learner can watch corrections with poor estimates.

## Edge Cases

- WHEN the list has fewer rows than fit in the box THEN system SHALL render all of them with no extra space below.
- WHEN the box is scrolled to the very end and rows above it are corrected THEN the last row SHALL stay aligned to the bottom.
- WHEN the active row is removed by filtering THEN system SHALL make the first matching row active on the next key press.
- WHEN the selected ticket is filtered out THEN its details SHALL stay visible, marked "not in the current filter".
- WHEN the user holds a key down (auto-repeat Down or Page Down) THEN focus SHALL keep up and never land on a row that isn't on the page.
- WHEN a row's text changes height because the theme or font finishes loading THEN system SHALL re-measure it and keep the view steady.
- WHEN the user prefers reduced motion THEN all programmatic scrolling SHALL be instant (it is instant by default).
- WHEN the filter changes while the user is mid-scroll THEN system SHALL apply the new list without a blank box.
- WHEN the jump field gets a number with separators ("87,000") THEN system SHALL accept it.

## Success Criteria

- [x] At 100,000 rows (virtualized, overscan 5), rows on the page never exceed visible rows + 10 + 1 during scrolling, keyboard navigation and jumps.
- [x] A 5-second continuous scroll through the 100,000-row list produces no main-thread task over 50 ms and no blank box after scrolling stops.
- [x] Jumping to 10 random rows in a 100,000-row list ends with the target row's top within 1 px of the box top every time.
- [x] At 10,000 rows, the virtualized list's first render is at least 10× faster than the naive one, as shown by the demo's own numbers.
- [x] Holding Down from row 1 to row 300 never loses focus (focus is always on the active row) and the active row is always fully visible.
- [x] Zero serious or critical issues in an automated accessibility audit of the list, in both themes.

## Open Questions

- None. Decisions are recorded in [decisions.md](decisions.md).

## Notes

- The explanation guide should cover: the window (visible range + overscan) and the spacer that sizes the scrollbar, estimating then measuring heights and correcting the scroll position for rows above the view, finding the row at a scroll position quickly, keeping the active row on the page for focus and screen readers (position-in-set), jumping to a row with corrections, keeping place across filter/sort, why naive rendering is slow, and limits (maximum element height, page vs inner scrolling, find-in-page not seeing off-screen rows).

---
id: "015"
feature: large-dataset-performance
type: greenfield
scope: complex
status: done
branch: main
created: 2026-10-08
---

# Feature: Large Dataset Performance Optimization

## Overview

Practice 14, the last of the React Practices section. A screen that shows
tens of thousands of live-updating rows is where "React is slow" complaints
come from, and the fix is rarely one trick: the learner has to measure first,
find which work is wasted (rows nobody can see, rows that didn't change, the
same sort repeated on every render, typing that waits for the list,
quadratic lookups), and fix each cause. Guessing leads to `memo` everywhere
and no real gain.

The demo is a live market board: 5,000, 20,000 or 50,000 instruments from
the project's own mock API, with prices that update several times a second.
The learner can filter, sort and select instruments while five optimizations
are switched on or off one at a time, and a metrics panel measures what each
change costs: render time per update, rows re-rendered, rows in the page,
typing delay, long tasks and frame rate. A scripted benchmark runs the same
scenario for any configuration and keeps the results side by side, so
"naive vs optimized" is a measured comparison, not a claim. Cross-practice
rules from feature 001 apply: the optimizations are hand-built (no virtual
list or table library), the page has an explanation guide, demo controls and
a live demo. Practice 7 already covers variable-height virtualization in
depth; this practice uses windowing as one lever among several.

## Goals

- [x] The learner can switch each of five optimizations on or off and see its effect in live measurements of the same screen.
- [x] A repeatable benchmark makes the naive and optimized versions comparable with numbers kept side by side.
- [x] With all optimizations on, the board stays smooth (typing, scrolling, live updates) at 50,000 rows.
- [x] The page never leaves the learner stuck with a frozen tab when a naive configuration is too heavy.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Variable-height rows, jump-to-row, scroll anchoring | Practice 7 covers them; rows here have one fixed height |
| Web Workers or moving sorting/filtering to the server | Different lever (off the main thread / practice 13's server mode); mentioned in the guide |
| Canvas or WebGL rendering | Leaves the DOM; out of the React focus of the practice |
| Editing cells, column resizing, multi-sort, row selection sets | Practice 13 covers grid interactions |
| A real market data feed | Updates are simulated; the point is the rendering cost |
| Persisting benchmark results across reloads | Results are for the session; the guide explains how to compare across builds |
| A virtual list, table or memoization library | The point is to build the techniques by hand |

## User Stories

### P1: A live board of many rows

- As a trader, I want to watch thousands of instruments update live, filter them and sort them so that I can follow the market.
- **Why P1:** The scenario every measurement runs on.
- **Independent Test:** Open the practice: 20,000 instruments load, prices update twice a second with up/down cues, typing "bank" narrows the board, clicking "Change %" sorts by it, clicking a row shows its live details.

**Acceptance Criteria:**

- [x] AC-001: WHEN the practice opens THEN system SHALL load the chosen number of instruments (default 20,000; 5,000, 20,000 or 50,000) from the mock API, showing a loading state, then a board with Symbol, Name, Sector, Price, Change %, Volume and Last update columns and the row count.
- [x] AC-002: WHILE the live feed runs THEN system SHALL update a batch of random instruments (default 200 per update, 2 updates per second; adjustable 50–2,000 and 1–10 per second, or paused) and show each changed price's direction with an arrow and text, not colour alone.
- [x] AC-003: WHEN the trader types in the filter THEN system SHALL show instruments whose symbol, name or sector contains every typed word (ignoring case and accents), with the count of matches.
- [x] AC-004: WHEN the trader activates a column header THEN system SHALL sort by that column (ascending, then descending), keep the order correct as prices update, and expose the sort state to assistive technology.
- [x] AC-005: WHEN the trader selects a row (click, or Enter/Space on its symbol) THEN system SHALL highlight it and show its details (all fields, live) in a side panel; it SHALL stay selected while the feed, filter and sort change, and the panel SHALL say when the filter hides it.

### P1: Switch optimizations on and off

- As a learner, I want to turn each optimization on and off so that I can see which work each one removes.
- **Why P1:** The core lesson.
- **Independent Test:** Choose "Naive": with 20,000 rows the metrics show about 20,000 rows re-rendered per update and commits of hundreds of milliseconds. Turn on only windowing: rows in the page drop to a few dozen and commit time falls sharply. Choose "Optimized": a feed update re-renders only the changed visible rows.

**Acceptance Criteria:**

- [x] AC-006: WHEN the learner toggles **windowing** THEN the board SHALL render only the rows in and near the viewport (on) or every matching row (off), with the same scroll height and the same visible content either way.
- [x] AC-007: WHEN the learner toggles **memoized rows** THEN a render SHALL re-render only rows whose data or selection changed (on) or every rendered row (off).
- [x] AC-008: WHEN the learner toggles **cached filter and sort** THEN filtering and sorting SHALL run again only when the data, filter or sort changed (on) or on every render, including selecting a row (off).
- [x] AC-009: WHEN the learner toggles **deferred filtering** THEN typing SHALL update the input immediately and the board when it can (on, with a visible "updating" cue while behind) or the input SHALL wait for the board on every keystroke (off).
- [x] AC-010: WHEN the learner toggles **indexed updates** THEN applying a feed update SHALL look rows up by id in constant time (on) or by scanning the list for each changed row (off).
- [x] AC-011: WHEN the learner picks a preset ("Naive": all off, "Optimized": all on) THEN all five SHALL switch at once; the current combination SHALL always be visible.
- [x] AC-012: WHEN any combination is active THEN the board SHALL show the same rows, order, values and selection as with any other combination (only the cost differs).

### P1: Measure it live

- As a learner, I want live measurements next to the board so that I can see the cost of each change instead of guessing.
- **Why P1:** "Measure first" is the lesson; without numbers the toggles are just claims.

**Acceptance Criteria:**

- [x] AC-013: WHILE the demo runs THEN a metrics panel SHALL show for the board: time of the last render and the average and worst of recent renders, renders per second, rows re-rendered in the last render, rows currently in the page, time spent filtering and sorting in the last render, and time spent applying the last feed update.
- [x] AC-014: WHEN the learner types in the filter THEN the panel SHALL show the delay from the keystroke to the next painted frame (last and worst).
- [x] AC-015: WHILE the demo runs THEN the panel SHALL show the frame rate and, where the browser supports it, the number of long tasks and the total blocking time over the last 10 seconds (and say "not supported" otherwise).
- [x] AC-016: WHEN measurements are taken THEN updating the panel SHALL NOT itself re-render the board.
- [x] AC-017: WHEN the learner presses "Reset metrics" THEN all measurements SHALL start over.

### P2: Benchmark and compare

- As a learner, I want to run the same scripted scenario on different configurations so that I can compare them with numbers.
- **Why P2:** Live numbers fluctuate; a repeatable run is how real performance work is judged.
- **Independent Test:** Run the benchmark on "Naive", then on "Optimized" with 20,000 rows: two result rows appear, and the optimized one shows far lower render times, typing delay and blocking time.

**Acceptance Criteria:**

- [x] AC-018: WHEN the learner starts the benchmark THEN system SHALL run a fixed scenario through the same code paths as the user (type a filter word one character at a time, clear it, sort two columns, select rows, scroll the board, and let the feed run), lasting about 10 seconds, showing its progress and current step, and allowing Stop.
- [x] AC-019: WHEN a run finishes THEN system SHALL add a result row: configuration (each optimization on/off), row count, median and 95th percentile render time, worst typing delay, long tasks and total blocking time, average frame rate, and median rows re-rendered per render; the last 6 runs SHALL be kept, with the fastest value in each column marked (in text, not colour alone).
- [x] AC-020: WHILE the benchmark runs THEN the controls that would change the scenario SHALL be disabled, and the feed SHALL use fixed settings so runs are comparable.

### P2: Stay safe with heavy configurations

- As a learner, I want the demo to protect the tab so that a naive configuration doesn't lock up the page.
- **Why P2:** Naive rendering of 50,000 live rows can freeze the browser; the lesson must stay usable.

**Acceptance Criteria:**

- [x] AC-021: WHEN the learner turns windowing off with more than 20,000 rows THEN system SHALL ask for confirmation first, stating how many rows will be rendered and that the tab may freeze for seconds.
- [x] AC-022: WHEN a single render takes longer than 1 second while the feed runs THEN system SHALL pause the feed and say why, with a Resume action.

### P3: Dataset and feed settings

- As a learner, I want to change dataset size and feed rate so that I can find where each configuration breaks.
- **Why P3:** Useful for exploring; the defaults already show the effects.

**Acceptance Criteria:**

- [x] AC-023: WHEN the learner changes the dataset size THEN system SHALL load that many instruments (once per size, reused afterwards), keep filter, sort and selection where possible, and reset the metrics.

## Edge Cases

- WHEN the filter matches nothing THEN the board SHALL say "No instruments match" with a Clear filter action, and the metrics SHALL keep working.
- WHEN the selected instrument is filtered out THEN the details panel SHALL keep showing it, marked as hidden by the filter.
- WHEN the board is scrolled near the end and the filter shrinks the list THEN it SHALL show the last rows instead of an empty area.
- WHEN the dataset fails to load THEN system SHALL show an error with Retry.
- WHEN the tab is hidden THEN the feed SHALL pause and resume when visible again, and frame-rate figures SHALL exclude the hidden time.
- WHEN the learner leaves the practice THEN the feed, benchmark and observers SHALL stop.
- WHEN two prices are equal in a sort THEN the order SHALL stay stable (by symbol).

## Success Criteria

- [x] With 20,000 rows and the default feed, the median render time with all optimizations on is at least 10× lower than with all off, measured by the benchmark.
- [x] With all optimizations on and 50,000 rows, the benchmark's worst typing delay stays under 100 ms and the average frame rate stays above 50 fps on the development machine.
- [x] With memoized rows on, a feed update re-renders no more rows than are visible (about 30), versus every rendered row with it off.
- [x] For 50 random combinations of the five optimizations, the board shows identical rows, order and values for the same data, filter and sort.
- [x] Zero serious or critical accessibility issues in both themes, and no horizontal page scrolling at 360 px width.

## Open Questions

- None. Defaults chosen without asking are recorded in [decisions.md](decisions.md).

## Notes

- The explanation guide should cover: measuring before optimizing (React Profiler, long tasks, input delay, frames), where render time goes (rows rendered × cost per row), windowing with fixed row heights (and practice 7 for variable heights), `memo` and what breaks it (new objects and callbacks each render, mutable updates), caching derived data and when it doesn't help (data that changes every update), `useDeferredValue` / transitions for input responsiveness, index lookups vs repeated scans, why development builds measure slower, and what else exists (workers, server-side processing, canvas).

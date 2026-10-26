---
id: "040"
feature: testing-code-tabs
type: brownfield
scope: medium
status: done
branch: main
created: 2026-10-22
---

# Feature: Tabbed code snippets on the Testing pages

## Overview

The Testing pages quote several files at once and lay them out in two
columns on wide screens. Each column gets half the reading width, so most
lines of test code run past the edge and the reader scrolls sideways inside
every block. The reader only reads one file at a time, so the second column
costs width without helping.

This change shows each group of quoted files as tabs: one file is visible at a
time, at the full width of the page. In the page-object comparison, where the
point is how many lines each version must edit, each tab also shows its count
of marked lines, so the comparison stays visible without both files on screen.

## Goals

- [x] On the Testing pages, no group of two or more quoted files is split into columns; each file reads at the full content width.
- [x] The page-object comparison still shows, without switching tabs, how many lines each file must edit for the chosen change.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cards that are meant to be compared together (stat tiles, test-double cards with their results, feature cards in the living docs) | The user asked for code snippets only; these show results side by side on purpose |
| The scenario editor and its output | Editing and reading the result belong on screen together |
| Pages outside the Testing section | Not requested |

## User Stories

### P1: Read one quoted file at full width

- As a learner, I want a group of quoted files shown as tabs, so that I can read each file without scrolling sideways.
- **Why P1:** It is the problem the user reported.
- **Independent Test:** Open the Playwright page on a wide screen; each group of files shows a tab bar and one file below it, using the full content width.

**Acceptance Criteria:**

- [x] AC-001: WHEN a Testing page quotes two or more files together (the Playwright page's test and page object, its component object and fixtures, its config and CI workflow; the BDD page's step files; the Testing strategy page's test code) THEN the system SHALL show one tab per file and only the selected file's code, at the full content width.
- [x] AC-002: WHEN the page loads THEN the first file SHALL be selected, and each tab SHALL be named after its file, with the full path shown above the code.
- [x] AC-003: WHEN a keyboard user reaches the tab bar THEN they SHALL be able to move between tabs with the arrow keys and select one, and the code below SHALL stay focusable for scrolling.

### P1: Compare edit counts in the page-object demo

- As a learner, I want each file's tab to show how many lines it must edit, so that I can compare the two approaches while reading one file.
- **Why P1:** The demo loses its point if the comparison is hidden behind a tab.
- **Independent Test:** Pick each change in the demo; every tab label shows the number of marked lines in its file, and the numbers match the totals above.

**Acceptance Criteria:**

- [x] AC-004: WHEN the page-object demo shows its three files THEN each tab SHALL show the file's name, whether it belongs to the version with a page object or without one, and its number of marked lines for the chosen change.
- [x] AC-005: WHEN the learner picks another change THEN the counts in the tabs SHALL update, the selected tab SHALL stay selected, and the counts SHALL be read out to screen readers as part of each tab's name.

## Edge Cases

- WHEN a quoted file is missing from the recorded run THEN its tab SHALL still appear and its panel SHALL show the existing "isn't in the recorded run" message.
- WHEN the tab names don't fit on one line (a phone screen) THEN the tab bar SHALL wrap instead of making the page scroll sideways.
- WHEN a file has no marked lines for the chosen change THEN its tab SHALL show a count of 0.

## Success Criteria

- [x] On a 1440 px wide screen, the longest lines in the page-object comparison that were cut off in two columns fit without sideways scrolling.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

Requested on 2026-10-22 with a screenshot of the page-object comparison,
where each file's lines were cut off at half width. The user chose to apply
tabs to code snippets only.

## Baseline

### Current Behavior

- On wide screens, groups of quoted files sit in two columns; on narrow screens they stack.
- The page-object comparison shows "With a page object" (two files, stacked) next to "Without one" (one file), with totals in tiles above.
- On the Testing strategy page, the test code opens under "Show the test code" as two blocks side by side.

### Gaps / Limitations

- In two columns, most lines of test code are cut off and need sideways scrolling inside each block.

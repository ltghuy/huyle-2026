---
id: "003"
feature: searchable-accordion
type: greenfield
scope: large
status: done
branch: main
created: 2026-10-06
---

# Feature: Searchable Accordion

## Overview

Practice 2 of the playground. The learner wants to build, from scratch, a
help-center style accordion: a long list of questions grouped by category,
each expanding to its answer, with a search box that narrows the list as you
type and shows exactly where each match is. It's a good exercise because it
combines a correct, accessible disclosure pattern (including the full
keyboard model), text matching that ignores case and accents, safe match
highlighting, smooth expand/collapse, and state that must stay coherent
while the visible set changes under the user.

Content comes from the project's own mock endpoint, so loading and error
states are real. Cross-practice rules from feature 001 apply (core logic
hand-built, explanation panel + demo controls).

## Goals

- [x] A user can find the right answer by typing a few words, without knowing the exact wording, category, or accents used.
- [x] The accordion follows the established accessible accordion pattern: screen reader users hear each section's name and state, and keyboard users can do everything a mouse user can.
- [x] Every match is visible to the user: in titles, in open answers, and as a snippet for collapsed answers.
- [x] Filtering stays instant (no visible lag between a keystroke and the updated list) even with ten times the normal content.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-expanding sections whose answer matches | Not selected; badge + snippet explains body matches instead |
| Reflecting the search or open sections in the URL | Not selected |
| Server-side search, debouncing, result caching | Covered by practice 12 (Debounced Search + API Cache) |
| Fuzzy / typo-tolerant matching, ranking by relevance | All-words matching is the chosen behavior; results keep content order |
| Editing content | Read-only help content |
| Nested accordions (sections inside sections) | One level of sections under category headings is enough for the practice |

## User Stories

### P1: Browse the FAQ accordion

- As a help-center visitor, I want questions grouped by category that expand to their answers so that I can scan topics and read only what I need.
- **Why P1:** This is the accordion itself; search and extras build on it.
- **Independent Test:** Open the practice; after loading, confirm categories with their questions are listed, clicking a question opens its answer, clicking again closes it, and a screen reader announces each question as a collapsed or expanded button.

**Acceptance Criteria:**

- [x] AC-001: WHEN the practice opens THEN system SHALL load the FAQ content from the project's mock endpoint and show a loading placeholder shaped like the list while it loads.
- [x] AC-002: WHEN loading fails THEN system SHALL show an error message with a Retry action inside the demo area; Retry SHALL load again.
- [x] AC-003: WHEN content is loaded THEN system SHALL show every question under its category heading, in content order, all collapsed.
- [x] AC-004: WHEN the user activates a question (click, Enter or Space) THEN system SHALL toggle its answer open or closed.
- [x] AC-005: WHEN a section opens or closes THEN system SHALL animate its height smoothly and rotate its indicator; WHEN the user prefers reduced motion THEN it SHALL open and close instantly.
- [x] AC-006: WHEN a screen reader reaches a question THEN system SHALL expose it as a button with the question as its name, its expanded/collapsed state, and a reference to the answer it controls; the answer SHALL be labelled by its question. Answers SHALL NOT be landmark regions, since dozens can be open at once (landmark overload).
- [x] AC-007: WHEN a section is collapsed THEN its answer SHALL be hidden from assistive technology and unreachable by Tab.

### P1: Search across titles and answers

- As a visitor, I want to type words and see only the sections that contain them so that I find the answer quickly.
- **Why P1:** "Searchable" is the point of this practice.
- **Independent Test:** Type "refund card" and confirm only sections containing both words (in any order, in question or answer) remain, the count reads "N of M sections match", and typing "zzz" shows a "No results" state with a Clear button that restores the full list.

**Acceptance Criteria:**

- [x] AC-008: WHEN the user types in the search box THEN system SHALL show only sections whose question or answer contains every word of the query, in any order.
- [x] AC-009: WHEN matching THEN system SHALL ignore letter case and accents ("cafe" matches "Café", "RESUME" matches "résumé").
- [x] AC-010: WHEN the query is empty or only whitespace THEN system SHALL show all sections.
- [x] AC-011: WHEN a search is active THEN system SHALL show "N of M sections match" and announce the count politely to screen readers after typing pauses.
- [x] AC-012: WHEN no section matches THEN system SHALL show a "No results for “…”" state with a hint to try fewer or different words and a Clear search button that empties the box, restores all sections and returns focus to the search box.
- [x] AC-013: WHEN the user presses Escape in a non-empty search box THEN system SHALL clear the search.
- [x] AC-014: WHEN a section the user had opened is filtered out and later matches again THEN system SHALL show it still open.

### P1: Show where each match is

- As a visitor, I want the matched words highlighted, including inside answers I haven't opened, so that I can tell why each section is listed.
- **Why P1:** Without this, sections that match only in a collapsed answer look like wrong results.
- **Independent Test:** Search for a word that appears only in an answer; confirm the collapsed section shows a "match in answer" badge with a highlighted snippet; open it and confirm the word is highlighted in the answer.

**Acceptance Criteria:**

- [x] AC-015: WHEN a search is active THEN system SHALL highlight every occurrence of every query word in visible questions and open answers, matching case- and accent-insensitively but displaying the original text unchanged.
- [x] AC-016: WHEN a section matches only in its answer and is collapsed THEN system SHALL show a "match in answer" badge and a one-line snippet of the answer around the first match, with the match highlighted.
- [x] AC-017: WHEN highlighted words overlap or touch (e.g. "car" and "card") THEN system SHALL show one continuous highlight, never nested or broken ones.
- [x] AC-018: WHEN the query contains characters with special meaning in patterns (such as `.`, `*`, `(`, `[`, `\`) THEN system SHALL treat them as literal text.
- [x] AC-019: WHEN content contains markup-like text (e.g. `<b>`) THEN system SHALL display it as text, never interpret it.

### P2: Keyboard navigation between questions

- As a keyboard user, I want arrow keys to move between questions so that I can scan long lists without tabbing through every open answer.
- **Why P2:** Tab, Enter and Space already make it usable; arrows make it efficient.

**Acceptance Criteria:**

- [x] AC-020: WHEN focus is on a question and the user presses Down/Up THEN system SHALL move focus to the next/previous visible question, wrapping at the ends.
- [x] AC-021: WHEN focus is on a question and the user presses Home/End THEN system SHALL move focus to the first/last visible question.
- [x] AC-022: WHEN the user presses Down in the search box THEN system SHALL move focus to the first visible question.

### P2: Single or multiple open sections

- As a learner, I want to switch between "one section at a time" and "many at once" so that I can see both accordion behaviors.
- **Why P2:** A classic variation of the pattern; the accordion works with one mode alone.

**Acceptance Criteria:**

- [x] AC-023: WHEN single mode is on and the user opens a section THEN system SHALL close any other open section.
- [x] AC-024: WHEN the user switches from multiple to single mode while several sections are open THEN system SHALL keep only the most recently opened one open.
- [x] AC-025: WHEN multiple mode is on THEN system SHALL allow any number of sections to be open.

### P2: Expand all / Collapse all

- As a visitor in multiple mode, I want to open or close every section at once so that I can read or tidy the whole list.
- **Why P2:** Convenience on top of individual toggling.

**Acceptance Criteria:**

- [x] AC-026: WHEN multiple mode is on THEN system SHALL offer Expand all and Collapse all; WHEN single mode is on THEN system SHALL hide or disable them.
- [x] AC-027: WHEN a search is active and the user chooses Expand all or Collapse all THEN system SHALL affect only the sections currently shown.
- [x] AC-028: WHEN every shown section is already open THEN Expand all SHALL be disabled; WHEN none is open THEN Collapse all SHALL be disabled.

### P2: Categories

- As a visitor, I want questions grouped under category headings so that I can scan by topic.
- **Why P2:** Structure that makes long lists easier; search works without it.

**Acceptance Criteria:**

- [x] AC-029: WHEN content is shown THEN system SHALL group sections under their category heading, with the number of sections shown in each category.
- [x] AC-030: WHEN a search leaves a category with no matching sections THEN system SHALL hide that category heading.
- [x] AC-031: WHEN a screen reader user lists headings THEN category headings SHALL be real headings at one level, and questions SHALL sit beneath them.

### P2: Demo controls

- As a learner, I want controls to stress the accordion so that I can see loading, errors and large content.
- **Why P2:** Makes the practice explorable.

**Acceptance Criteria:**

- [x] AC-032: WHEN the user changes the latency or failure rate and chooses Reload THEN system SHALL load the content again with those settings.
- [x] AC-033: WHEN the user switches content size between normal (about 40 sections) and large (about 400 sections) THEN system SHALL reload with that amount of content.
- [x] AC-034: WHEN the user toggles single/multiple mode in the controls THEN system SHALL apply it immediately (see AC-023–AC-025).

## Edge Cases

- WHEN the user types while content is still loading THEN system SHALL keep the query and apply it as soon as content arrives.
- WHEN content reloads THEN system SHALL keep the query and keep open any section that still exists.
- WHEN the content is empty THEN system SHALL show "No questions yet" instead of an empty list.
- WHEN the query is very long (over 100 characters) THEN system SHALL limit input to 100 characters.
- WHEN a query word appears many times in one answer THEN system SHALL highlight every occurrence.
- WHEN a word matches inside another word ("pay" in "payment") THEN system SHALL count it as a match and highlight only the matched part.
- WHEN a focused question is filtered out by typing THEN focus SHALL stay in the search box (the user is typing there), and nothing SHALL be focused that is no longer shown.
- WHEN the snippet's match is near the start or end of the answer THEN system SHALL not add an ellipsis on that side.
- WHEN a section is open in single mode and filtered out, and the user opens another visible section THEN system SHALL close the hidden one too.

## Success Criteria

- [x] Filtering and highlighting update within one frame (under 16 ms of main-thread work) per keystroke with the large (about 400 sections) content.
- [x] Zero serious or critical issues in an automated accessibility audit with search active and sections both open and collapsed.
- [x] All keyboard interactions (Tab, Enter, Space, Up, Down, Home, End, Escape) work as specified, checked by a keyboard-only walkthrough.
- [x] Ten sample queries, including accented, mixed-case, multi-word and special-character ones, return exactly the expected sections and highlights.

## Open Questions

- None. Decisions are recorded in [decisions.md](decisions.md).

## Notes

- The explanation panel should cover: the disclosure pattern (button + controlled region, expanded state), why collapsed content must be removed from the tab order and accessibility tree, accent folding while keeping original text for display, merging overlapping highlight ranges, and why highlighting must build text and highlight nodes instead of injecting markup.

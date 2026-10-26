---
id: "025"
feature: design-autocomplete
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-12
---

# Feature: Frontend System Design, Design an autocomplete

## Overview

The second case study of the System Design section. It applies the design
method to a typeahead/autocomplete: an input that suggests results as the user
types. The prompt looks small but hides the decisions senior interviews probe —
debouncing, cancelling stale requests, dropping out-of-order responses, caching,
and the full accessible combobox keyboard pattern.

Like the news-feed case study, it reuses the method and links the built
`debounced-search` React practice as the implementation of the request
lifecycle. Its own demos cover the two things that make autocomplete subtle: the
race condition where a slow earlier response overwrites a fast later one, and the
keyboard/ARIA combobox pattern. Interactive pieces are client-side references,
labelled as examples, not the only correct answer.

## Goals

- [x] The page is reachable in one click from the sidebar, the Frontend System Design section page and the home card (the section shows 3 of 3 pages written), and the design-method page lists it among the case studies.
- [x] The page applies the method to an autocomplete end to end, so a senior engineer sees a complete worked answer, with the request lifecycle and accessibility treated as the deep dives and linking the built practice that implements them.
- [x] Each topic has an interactive reference or diagram whose content responds to the reader, and every figure is labelled as one example with at least one named alternative.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rebuilding debounced search with caching | Already built as a React practice; this page links to it as the lifecycle implementation |
| A real search backend or ranking engine | Ranking is discussed; the demos are client-side simulations over a local corpus, labelled |
| Fuzzy-matching algorithms in depth | Prefix/substring matching is enough to show the design; fuzzy is named as an alternative |
| The other case studies (chat, design system) | Their own later features |

## User Stories

### P1: Reach the page

- As a learner, I want the case study listed and linked so that I can open it from the section and the method page.
- **Why P1:** Nothing is usable without the route and navigation.
- **Independent Test:** From the home System Design card, open the section, then this page; the method page lists it among the case studies.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home card, the sidebar or the section page is shown THEN the page SHALL be listed and counted (System Design: 3 of 3 written), and the design-method page SHALL list it among the case studies.
- [x] AC-002: WHEN the page opens THEN it SHALL show breadcrumbs (Home, Frontend System Design, page), title, intro and a topic list linking to its topics.

### P1: Requirements and architecture

- As a learner, I want the autocomplete's requirements and a high-level architecture, so that I see the method's first stages applied.
- **Why P1:** The case study must start where the method says to start.
- **Independent Test:** Read the scoped requirements and see an architecture diagram naming the input, the results list, the query engine with its cache, and the suggestion source.

**Acceptance Criteria:**

- [x] AC-003: WHEN the requirements topic is shown THEN it SHALL list the autocomplete's functional and non-functional requirements and explicit scope cuts, consistent with the method page's autocomplete example.
- [x] AC-004: WHEN the architecture topic is shown THEN it SHALL present a diagram of the components and data flow (input, results list, a query engine with a cache, the debounced suggestion source), readable in light and dark, and SHALL name an alternative (e.g. an edge search index).

### P1: The request lifecycle

- As a learner, I want to see why autocomplete needs debouncing and a stale-response guard, shown live, so that a subtle correctness bug becomes concrete.
- **Why P1:** The out-of-order race is autocomplete's signature failure and the most-probed decision.
- **Independent Test:** Type (or replay a burst) with the stale-response guard off and see a slow earlier response overwrite the current results; turn the guard on and see only the latest query's results win. Toggle debounce and see the request count change.

**Acceptance Criteria:**

- [x] AC-005: WHEN the lifecycle topic is shown THEN it SHALL explain debouncing (fewer requests), cancellation, and dropping out-of-order responses (the latest query must win), and why requests are cached by the normalised query string.
- [x] AC-006: WHEN the reader runs the demo with the stale-response guard off THEN the page SHALL show the displayed results no longer matching the current query after a slow earlier response arrives; WHEN the guard is on THEN the displayed results SHALL always match the latest query; the demo SHALL report the request count and which responses were applied or dropped.
- [x] AC-007: WHEN the reader toggles debounce THEN the number of requests issued for the same typing SHALL change, and a fresh cache hit SHALL issue no request.

### P1: Deep dives — accessibility and ranking

- As a learner, I want the accessible combobox keyboard pattern working, plus ranking and highlighting, so that I see the parts beyond fetching.
- **Why P1:** Autocomplete is a keyboard-first, screen-reader-sensitive control; getting the combobox pattern right is a senior expectation.
- **Independent Test:** Operate a suggestion list entirely by keyboard (arrow keys move the active option, Enter selects, Escape closes) with the active option announced, and see the matched text highlighted.

**Acceptance Criteria:**

- [x] AC-008: WHEN the reader focuses the demo combobox and types THEN it SHALL show matching suggestions with the matched text highlighted, and SHALL expose the combobox ARIA pattern (the listbox, the active option, and selection state).
- [x] AC-009: WHEN the reader uses the keyboard THEN Arrow Down/Up SHALL move the active option (wrapping), Enter SHALL select it, Escape SHALL close the list, and the active option SHALL be conveyed to assistive technology; the mouse SHALL work too.
- [x] AC-010: WHEN the deep-dives topic is shown THEN it SHALL cover ranking and highlighting and link the built debounced-search practice as the lifecycle implementation, naming a trade-off (prefix vs fuzzy, client vs server ranking).

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-011: WHEN a topic is shown THEN it SHALL end with a short "read more" linking the built practice and reputable references (WAI-ARIA combobox pattern, MDN), and SHALL point back to the method and onward to the next case studies.

## Edge Cases

- WHEN the query is empty THEN the demo SHALL show no suggestions and issue no request, not an error.
- WHEN no suggestion matches THEN the combobox SHALL say so rather than show an empty box.
- WHEN the stale-response guard is on and an out-of-order response arrives THEN it SHALL be visibly dropped, and the displayed results SHALL stay on the latest query.
- WHEN the reader uses only the keyboard THEN every control (toggles, input, suggestion list) SHALL be operable and clearly focused.
- WHEN the page is viewed at 360 px THEN the diagram, controls, input and suggestion list SHALL stack without horizontal scroll.

## Success Criteria

- [x] With the stale-response guard off, a slow earlier response visibly leaves the displayed results not matching the current query; with it on, they always match.
- [x] Toggling debounce changes the request count for the same typing, and a cache hit issues no request.
- [x] The suggestion list is fully operable by keyboard (arrow/Enter/Escape) with the active option announced, and matches are highlighted.
- [x] The deep dive links the debounced-search practice.
- [x] The page passes axe in light and dark themes, works at 360 px without horizontal scroll, and is fully keyboard-operable.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

- Second case study of the System Design section; reuses the autocomplete example from the method page's dataset and the debounced-search practice as the lifecycle implementation.
- Same shape as the method and news-feed pages: reasoning, a diagram and client-side interactive references, no server lab; the lifecycle demo is a simulation over a local corpus, labelled.

## Baseline

### Current Behavior

- Frontend System Design has two pages (the design method and Design a news feed). The method page points to further case studies that don't exist yet.

### Gaps / Limitations

- No autocomplete case study exists, so the request-lifecycle and combobox-accessibility decisions aren't shown applied.

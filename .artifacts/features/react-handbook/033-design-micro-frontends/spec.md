---
id: "033"
feature: design-micro-frontends
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-20
---

# Feature: Frontend System Design, Design micro frontends

## Overview

A fifth case study for the System Design section: "an online store is built by
four teams (a platform team that owns the shell, plus catalog, checkout and
account). Each team wants to release on its own schedule without waiting for
the others. Design the frontend." Micro frontends come up in most senior and
staff frontend interviews, and teams adopt them for organisational reasons
more often than technical ones. The hard parts (where the page is composed,
how shared libraries are loaded once, how pieces talk to each other, how one
broken piece stays contained, and how styles stay consistent without leaking)
are rarely shown working, and the most useful senior answer, "you may not need
this", is rarely argued with criteria.

The page applies the design method end to end, like the other case studies,
and stays tool-neutral: it teaches the concepts and compares the common
composition approaches and tools side by side. Every demo is a client-side
model of one sample store, labelled as one example with at least one named
alternative. The monorepo case study already names micro frontends as an
alternative; this page is where that alternative gets designed.

## Goals

- [x] The page can be opened in one click from the sidebar, the Frontend System Design section page and the home card (the section shows 5 of 5 pages written), and the design-method page and the monorepo case study link to it.
- [x] The page applies the method to a micro-frontend architecture end to end, so a senior engineer sees a complete worked answer: when to choose it, composition, shared dependencies, routing and communication, deployment and failure isolation, and styling.
- [x] Each topic has an interactive reference whose output changes with what the reader does, and every figure is labelled as one example with at least one named alternative.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Loading real remote applications or running a federation runtime in the browser | The site is one app on one origin; demos model a fixed sample store, labelled "simplified". Only the styling demo uses the browser's real style and shadow-tree behaviour |
| A setup tutorial for one specific tool or framework | The page stays tool-neutral; tools are compared, not taught |
| Splitting this site into micro frontends | This is a learning page, not a change to the project |
| Backend-for-frontend and API gateway design | Mentioned only where a composition approach needs a server; not designed |
| Mobile and native micro-app architectures | Different platform constraints; web only |

## User Stories

### P1: Reach the page

- As a learner, I want the case study listed and linked so that I can open it from the section, the method page and the monorepo case study.
- **Why P1:** Nothing is usable without the route and navigation.
- **Independent Test:** From the home System Design card, open the section, then this page. The method page and the monorepo page link to it.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home card, the sidebar or the section page is shown THEN the page SHALL be listed and counted (System Design: 5 of 5 written), and the design-method page and the other case studies' "next" pointers SHALL list it.
- [x] AC-002: WHEN the page opens THEN it SHALL show breadcrumbs (Home, Frontend System Design, page), title, intro and a topic list linking to its topics.

### P1: Requirements, architecture and whether to use micro frontends at all

- As a learner, I want the store's requirements, an architecture diagram and a way to test whether micro frontends fit a situation so that I can argue for or against them with criteria.
- **Why P1:** The case study must start where the method says to start, and "should we?" is the first question a senior engineer is expected to ask.
- **Independent Test:** Read the scoped requirements, see a diagram of the shell and the three team-owned pieces, then answer the fit questions for a small single-team product and see a recommendation against micro frontends; answer them for several teams with conflicting release schedules and see a recommendation for them.

**Acceptance Criteria:**

- [x] AC-003: WHEN the requirements topic is shown THEN it SHALL list functional requirements (one store that looks like one product, each team owns its pages end to end, shared header and cart), non-functional requirements (independent releases, a failure in one piece doesn't take down the page, page weight and load time budgets, consistent look) and explicit scope cuts.
- [x] AC-004: WHEN the requirements topic is shown THEN it SHALL present a diagram of the sample store (a shell owned by the platform team that composes catalog, checkout and account pieces, each with its own team, repository or folder, and release pipeline), readable in light and dark, and SHALL compare a single app, a modular monolith or monorepo, and micro frontends as alternatives.
- [x] AC-005: WHEN the reader answers the fit questions (number of teams, how often their releases block each other, need for different frameworks or gradual migration, how much the pieces share, performance budget) THEN the demo SHALL recommend an approach (stay with one app, split into modules inside one app, or micro frontends with a suggested composition style) and SHALL list the reasons that drove the recommendation.

### P1: Composition, where the page is put together

- As a learner, I want to compare the ways separately built pieces can be put together into one page so that I can pick one for a given set of requirements.
- **Why P1:** Composition is the main architectural fork and every later decision depends on it.
- **Independent Test:** Switch between build-time, server-side, edge, client-side runtime and iframe composition and see the load timeline and the properties table change.

**Acceptance Criteria:**

- [x] AC-006: WHEN the reader picks a composition approach THEN the demo SHALL show a simulated load timeline of the store's product page (document, shell, each piece's code and data) and the time to first content, labelled as a model with its assumptions shown.
- [x] AC-007: WHEN the reader picks a composition approach THEN the demo SHALL show, for the same set of properties (releases independently, needs a server, server-rendered content for search and first paint, shared libraries loaded once, style and script isolation, can mix frameworks), how that approach scores, with a short reason for each.
- [x] AC-008: WHEN the composition topic is shown THEN it SHALL include a tool-neutral comparison of common tools for each approach, labelled as of its research date.

### P1: Deep dive, shared dependencies

- As a learner, I want to see which copy of a shared library each piece ends up using under different sharing settings so that I understand why duplicate frameworks break or bloat a page.
- **Why P1:** Duplicate or mismatched shared libraries are the most common production failure of runtime composition, and interviewers probe it.
- **Independent Test:** With the framework shared as a single copy and all pieces asking for compatible versions, see one copy loaded. Make one piece ask for an incompatible major version and see a warning, or an error when strict checking is on. Turn off single-copy sharing and see two copies and the extra bytes.

**Acceptance Criteria:**

- [x] AC-009: WHEN the reader sets each piece's provided version and accepted range for a shared library and the sharing options (single copy only, strict version check) THEN the demo SHALL show which version each piece uses, how many copies load, the extra bytes downloaded, and any warning or error, following the negotiation rules of the researched runtime.
- [x] AC-010: WHEN two copies of a framework that keeps global state would load THEN the demo SHALL explain the user-visible failure (state or context from one copy invisible to the other) and SHALL contrast it with a stateless utility where two copies only cost bytes.
- [x] AC-011: WHEN the topic is shown THEN it SHALL explain the shared design system and how its versions are rolled out across pieces, and the trade-off between sharing more (smaller pages, coupled upgrades) and sharing less (bigger pages, independent upgrades).

### P1: Deep dive, routing and communication

- As a learner, I want to see which piece owns which URL and how pieces send each other messages so that I can design contracts that let teams change their code without breaking each other.
- **Why P1:** Routing and cross-piece communication decide how coupled the teams really are.
- **Independent Test:** Enter a URL and see which piece handles it. Add a product to the cart from the catalog piece and see the header's cart count update through an event. Change the event's shape in a breaking way and see the listener fail; change it additively and see it keep working.

**Acceptance Criteria:**

- [x] AC-012: WHEN the reader enters or picks a URL THEN the demo SHALL show which piece owns it (the shell owns the top-level path, each piece owns the paths under its prefix) and what the shell renders for an unknown path.
- [x] AC-013: WHEN the reader triggers an action in one piece THEN the demo SHALL show the message travelling to the pieces that listen for it and the resulting change, and SHALL contrast messaging through the URL, browser events and a shared store.
- [x] AC-014: WHEN the reader changes the message contract on the sending side (add a field, rename a field, remove a field, change a type) while the receiving side stays on the old version THEN the demo SHALL show whether the receiver still works and SHALL name the change as compatible or breaking.

### P1: Deep dive, deployment and failure isolation

- As a learner, I want to release, roll back and break individual pieces and see what the user sees so that I can design for independent releases that fail safely.
- **Why P1:** Independent release is the reason to adopt micro frontends, and containing failures is what makes it safe.
- **Independent Test:** Release a new version of the checkout piece and see only it change. Roll it back alone. Make the account piece fail or time out and see the page keep working with a fallback when isolation is on, and the whole page fail when it is off.

**Acceptance Criteria:**

- [x] AC-015: WHEN the reader releases or rolls back one piece THEN the demo SHALL update only that piece's version in the shell's list of current versions and leave the others unchanged.
- [x] AC-016: WHEN the reader sets a piece to healthy, slow, failing, or released against an incompatible contract THEN the demo SHALL show what the user sees on the page, with and without failure isolation (a boundary that catches the error, a timeout and a fallback), and SHALL name which non-functional requirement each outcome meets or breaks.
- [x] AC-017: WHEN the topic is shown THEN it SHALL explain gradual rollout (a share of users on the new version), contract tests between pieces, and monitoring per piece, each with a trade-off.

### P1: Deep dive, styling and consistency

- As a learner, I want to see one piece's styles leak into another and try the ways to stop it so that I can choose an isolation approach.
- **Why P1:** Style collisions and visual drift are the first problems users notice when teams ship separately.
- **Independent Test:** With no isolation, see a piece's broad style rule change the shell's buttons. Switch to prefixed class names, scoped class names, and a shadow tree, and see the leak disappear; see which theme values still reach inside the shadow tree.

**Acceptance Criteria:**

- [x] AC-018: WHEN the reader picks an isolation approach (none, naming convention, scoped class names, shadow tree) THEN the demo SHALL render the shell and a piece with real styles in the browser and show whether the piece's rules leak into the shell, and the shell's into the piece.
- [x] AC-019: WHEN the shadow-tree approach is selected THEN the demo SHALL show that inherited properties and theme variables still cross the boundary while selectors do not, and SHALL explain the cost (global styles and fonts must be supplied inside).
- [x] AC-020: WHEN the topic is shown THEN it SHALL explain how a shared design system and shared theme tokens keep the pieces visually consistent.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-021: WHEN a topic is shown THEN it SHALL end with a short "read more" linking reputable references (official tool docs, well-known write-ups), and the page SHALL point back to the method and to the other case studies.

## Edge Cases

- WHEN the fit questions describe one team THEN the recommendation SHALL be against micro frontends regardless of the other answers, and say why.
- WHEN every piece asks for the same shared version THEN the dependency demo SHALL show one copy and no warnings under every setting.
- WHEN single-copy sharing is on and no provided version satisfies a piece's range THEN the demo SHALL still pick one copy and warn, or fail that piece when strict checking is on, as the researched runtime does.
- WHEN the reader enters a URL that no piece owns THEN the routing demo SHALL show the shell's not-found page, not an error.
- WHEN every piece is set to failing with isolation on THEN the page SHALL still show the shell with fallbacks in every slot.
- WHEN the reader uses only the keyboard THEN every control (fit questions, approach picker, version inputs, URL input, contract editor, health toggles, isolation picker) SHALL be operable and clearly focused.
- WHEN the page is viewed at 360 px THEN diagrams, timelines, tables and controls SHALL stack or scroll inside their own region without page-level horizontal scroll.

## Success Criteria

- [x] The fit demo recommends against micro frontends for a single team and for them when several teams block each other's releases, with reasons listed.
- [x] Switching composition approach changes the timeline and the properties table; the comparison of tools carries a research date.
- [x] The dependency demo shows one copy for compatible ranges, a warning or error for an incompatible one depending on strict checking, and two copies with extra bytes when single-copy sharing is off.
- [x] Every URL maps to one owner or the not-found page; additive contract changes pass and breaking ones are named and fail.
- [x] Releasing or rolling back one piece changes only its version; with isolation a failing piece shows a fallback, without it the page fails.
- [x] The styling demo shows a real leak with no isolation and none with the other approaches, and shows theme variables crossing into the shadow tree.
- [x] The page passes axe in light and dark themes, works at 360 px without horizontal scroll, and is fully keyboard-operable.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

- Fifth case study of the System Design section. Like the monorepo page, the product is the way teams build and ship, so the users are the engineers as much as the shoppers.
- Same shape as the other case studies: reasoning, a diagram and client-side interactive references over one fixed sample store shared by all demos, no server lab.
- Tool facts (the sharing and version-negotiation rules, which tools support which composition approach, browser support) are researched and dated before writing, never stated from memory.

## Baseline

### Current Behavior

- Frontend System Design has four pages (the design method, Design a news feed, Design an autocomplete, Design a frontend monorepo). The monorepo page names micro frontends as an alternative in its architecture comparison but doesn't design one, and its closing note points to chat and design-system case studies as next.

### Gaps / Limitations

- No case study covers composing separately released frontends, so composition approaches, shared-dependency negotiation, cross-piece contracts, failure isolation and style isolation aren't shown.

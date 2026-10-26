---
id: "024"
feature: design-news-feed
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-12
---

# Feature: Frontend System Design, Design a news feed

## Overview

The design-method page (feature 023) teaches how to run a frontend design; this
is the section's first **case study** — it applies that method to the most-asked
prompt, "design a news feed". It walks the stages concretely for a feed:
requirements, an architecture, the data model, pagination, and the deep dives a
feed actually turns on (rendering a huge list, loading media without layout
shift, optimistic interactions, and freshness).

The page reuses the feed worked example already in the method page's dataset and
points at the section's built React practices (infinite scroll, virtualized
lists, lazy images, a caching fetch hook, optimistic real-time) as the
implementations of its deep dives. Its own demos cover the feed-specific
decisions those practices don't: why a feed needs cursor pagination, and how an
optimistic interaction rolls back. Interactive pieces are client-side
references, labelled as examples, not the only correct answer.

## Goals

- [x] The page is reachable in one click from the sidebar, the Frontend System Design section page and the home card (the section shows 2 of 2 pages written), and the design-method page points to it as its first case study.
- [x] The page applies the method's stages to a news feed end to end, so a senior engineer sees a complete worked answer, not a feature list — with the hard parts (large list, media, interactions, freshness) treated as deep dives, each linking to the built practice that implements it.
- [x] Each topic has an interactive reference or diagram whose content responds to the reader, and every figure is labelled as one example with at least one named alternative.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rebuilding infinite scroll / virtualization / lazy images / caching | Already built as React practices; this page links to them as the deep-dive implementations |
| A real backend or feed-ranking algorithm | The ranking boundary is discussed; the demos are client-side simulations, labelled |
| The other case studies (autocomplete, chat, design system) | Their own later features |
| Native/mobile feed specifics beyond responsive web | The handbook's lens is the web client |

## User Stories

### P1: Reach the page

- As a learner, I want the case study listed and linked so that I can open it from the section and from the method page.
- **Why P1:** Nothing is usable without the route and navigation.
- **Independent Test:** From the home System Design card, open the section, then this page; the method page links here.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home card, the sidebar or the section page is shown THEN the page SHALL be listed and counted (System Design: 2 of 2 written), and the design-method page SHALL link to it as a case study.
- [x] AC-002: WHEN the page opens THEN it SHALL show breadcrumbs (Home, Frontend System Design, page), title, intro and a topic list linking to its topics.

### P1: Requirements and architecture

- As a learner, I want the feed's requirements and a high-level architecture, so that I see how the method's first stages produce a concrete design.
- **Why P1:** The case study must start where the method says to start.
- **Independent Test:** Read the scoped requirements and see an architecture diagram naming the views, the data layer and the services, with the rendering choice justified.

**Acceptance Criteria:**

- [x] AC-003: WHEN the requirements topic is shown THEN it SHALL list the feed's functional and non-functional requirements and explicit scope cuts, consistent with the method page's feed example.
- [x] AC-004: WHEN the architecture topic is shown THEN it SHALL present a diagram of the feed's components and data flow (views, a feed/data layer, the API, media delivery), readable in light and dark, and SHALL state and justify the rendering strategy, naming an alternative.

### P1: Data model and pagination

- As a learner, I want the feed's data model and why it needs cursor pagination, shown live, so that a non-obvious senior decision becomes concrete.
- **Why P1:** Pagination drift is the feed's signature data problem and isn't covered by the existing practices.
- **Independent Test:** Page through a simulated feed with offset pagination while new posts arrive and see items duplicated or skipped; switch to cursor pagination and see the same scenario stay stable.

**Acceptance Criteria:**

- [x] AC-005: WHEN the data-model topic is shown THEN it SHALL describe a normalised post store keyed by id and the feed as an ordered list of ids with a cursor, and why an interaction (a like) then updates one place.
- [x] AC-006: WHEN the reader pages through the simulated feed with new posts arriving between pages THEN the page SHALL show, for offset pagination, the resulting duplicates or skips, and for cursor pagination, a stable sequence, naming the trade-off each makes.

### P1: Deep dives — list, media and interactions

- As a learner, I want the feed's hard parts treated as deep dives that link to working implementations, plus a live optimistic interaction, so that I see both the reasoning and the code.
- **Why P1:** The deep dives are where a feed design is won or lost.
- **Independent Test:** Read why the list is virtualized and media is loaded without layout shift (each linking to the built practice), and click a like that updates instantly and rolls back when the server rejects it.

**Acceptance Criteria:**

- [x] AC-007: WHEN the deep-dives topic is shown THEN it SHALL explain rendering a large list (virtualization), loading media without layout shift, and prefetching the next page, and SHALL link each to the built React practice that implements it.
- [x] AC-008: WHEN the reader likes a post in the demo THEN the UI SHALL update immediately (optimistic) and, when a simulated server rejection is enabled, SHALL roll back and explain why; a count SHALL stay consistent across repeated clicks.
- [x] AC-009: WHEN the deep-dives topic is shown THEN it SHALL cover feed freshness and the client/server ranking boundary (how stale the feed may be; what the client does vs the server), naming the trade-off.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-010: WHEN a topic is shown THEN it SHALL end with a short "read more" linking the relevant built practices and reputable references, and SHALL point back to the design method and onward to the next case studies.

## Edge Cases

- WHEN no page has been loaded yet in the pagination demo THEN it SHALL show a clear starting state, not an empty panel.
- WHEN the optimistic-like demo has server rejection on THEN every like SHALL visibly revert and the count SHALL return to its prior value exactly.
- WHEN the reader uses only the keyboard THEN the pagination controls, the rejection toggle and the like buttons SHALL be operable and clearly focused.
- WHEN the page is viewed at 360 px THEN the diagram, controls and feed items SHALL stack without horizontal scroll.

## Success Criteria

- [x] Offset pagination visibly duplicates or skips an item when a post is inserted between pages; cursor pagination does not, in the same scenario.
- [x] An optimistic like updates instantly and, with rejection on, rolls back to the exact previous count.
- [x] Each deep dive links to the matching built practice.
- [x] The page passes axe in light and dark themes, works at 360 px without horizontal scroll, and is fully keyboard-operable.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

- First case study of the System Design section; reuses the feed example from the method page's dataset and the section's built practices as deep-dive implementations.
- Same shape as the method page: reasoning, a diagram and client-side interactive references, no server lab; the pagination and optimistic demos are simulations, labelled.

## Baseline

### Current Behavior

- Frontend System Design has one page, the design method, which ends by pointing forward to case studies that don't exist yet.

### Gaps / Limitations

- No worked case study exists, so the method has nothing concrete to be seen applied to.

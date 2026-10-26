---
id: "023"
feature: system-design-method
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-12
---

# Feature: Frontend System Design section, the design method

## Overview

Frontend System Design is the last handbook section still listed as coming
soon. Its hardest part for a senior engineer isn't any one feature — it's
running the design itself: turning a vague prompt ("design a news feed") into
scoped requirements, an architecture, a data model, an API, and a defended set
of trade-offs, out loud, in order. This feature opens the section and writes
its spine: **The design method** — a repeatable framework that every later
case-study page (feed, autocomplete, chat, design system) will reference.

Unlike the other handbook pages, this one teaches a way of thinking, so its
interactive pieces are client-side references, not server labs: a stepper
through the framework worked on a sample product, a requirements clarifier, and
a trade-off explorer. Anything illustrative is labelled as such.

## Goals

- [x] The Frontend System Design section stops being "coming soon": it is reachable from the sidebar, the home card (showing 1 of 1 page written) and its own section page, which lists the method page.
- [x] The page gives a senior engineer a framework they can apply to any frontend design prompt: the ordered stages, what to produce in each, and the questions to ask — not generic advice.
- [x] Each of the page's topics has an interactive reference whose content changes with the reader's input (a chosen product, a chosen decision), and every illustrative figure is labelled as an example, not a rule.

## Out of Scope

| Feature | Reason |
|---------|--------|
| The case-study pages (news feed, autocomplete, chat, design system) | Their own later features; this page is the method they reuse |
| A server lab or any backend | The method is reasoning and structure; no real request needs to run |
| An exhaustive catalogue of every architecture pattern | The page teaches a method and the main axes; depth lives in the case studies |
| Backend/system design in general (databases, sharding, queues) | This is the frontend handbook; the lens is the browser and the client |

## User Stories

### P1: Open the section

- As a learner, I want the System Design section to be a real, navigable section so that I can start on it like the others.
- **Why P1:** Nothing can be read until the section and route exist and the "coming soon" state is gone.
- **Independent Test:** From the home System Design card, open the section, then the method page; breadcrumbs lead back.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home page, the sidebar or the section page is shown THEN Frontend System Design SHALL appear as an open section (not "coming soon"), counted as 1 of 1 page written, and the section page SHALL list the method page with its summary.
- [x] AC-002: WHEN the method page opens THEN it SHALL show breadcrumbs (Home, Frontend System Design, page), title, intro and a topic list linking to its topics.

### P1: The framework

- As a learner, I want the ordered stages of a frontend design, with what to produce in each, so that I have a structure to run any prompt through.
- **Why P1:** The framework is the whole point of the page; everything else supports it.
- **Independent Test:** Step through the stages for a sample product and see, at each stage, what to produce and the specific decisions that product forces.

**Acceptance Criteria:**

- [x] AC-003: WHEN the framework topic is shown THEN it SHALL present the stages in order (clarify requirements; high-level architecture; data model; interface and data flow; deep dives and optimisations; trade-offs and wrap-up), each with what to produce and the common mistakes to avoid.
- [x] AC-004: WHEN the reader steps through the framework for a chosen sample product THEN the page SHALL show, per stage, how that stage applies to that product (the decisions it forces and a short worked note), and SHALL let the reader move between stages.
- [x] AC-005: WHEN a worked example or diagram is shown THEN it SHALL be labelled as one example, not the only correct answer, and SHALL name at least one alternative.

### P1: Requirements and scoping

- As a learner, I want to separate functional from non-functional requirements and know the clarifying questions to ask, so that I scope before I design.
- **Why P1:** Mis-scoping is the most common and most penalised senior mistake; it deserves its own treatment.
- **Independent Test:** Pick a product and see its functional requirements, its non-functional requirements, and the clarifying questions, with the reader able to reveal or hide them.

**Acceptance Criteria:**

- [x] AC-006: WHEN the reader picks a sample product THEN the page SHALL show example functional requirements, non-functional requirements (performance, accessibility, offline, i18n, security, device/network), and the clarifying questions a senior engineer would ask first, each distinguished from the others.
- [x] AC-007: WHEN the requirements topic is shown THEN it SHALL explain why non-functional requirements and explicit scope cuts ("out of scope") carry as much weight as the feature list, and SHALL show that the same prompt yields different designs under different constraints.

### P1: Trade-offs and non-functionals

- As a learner, I want the recurring frontend design decisions laid out as options with when-to-use, so that I can reason about trade-offs instead of guessing.
- **Why P1:** "It depends — here's the trade-off" is the senior answer; the page must model it.
- **Independent Test:** Pick a decision (e.g. rendering strategy, pagination, state location) and see its options side by side with the forces that pick each.

**Acceptance Criteria:**

- [x] AC-008: WHEN the reader picks a recurring decision (rendering strategy; data fetching and caching; pagination; state location; realtime transport) THEN the page SHALL show its main options with, for each, what it is, when it wins and what it costs.
- [x] AC-009: WHEN the trade-offs topic is shown THEN it SHALL tie each decision back to the non-functional requirements it serves, and SHALL stress stating assumptions and alternatives over naming a single "best".

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-010: WHEN a topic is shown THEN it SHALL end with a short "read more" and links to reputable frontend system-design references, and SHALL point forward to the case-study pages this method will be applied to.

## Edge Cases

- WHEN no product or decision is selected yet THEN each interactive reference SHALL show a sensible default or a prompt to choose, not an empty panel.
- WHEN the reader uses only the keyboard THEN every stepper control, product picker and decision picker SHALL be operable and clearly focused.
- WHEN the page is viewed at 360 px THEN the stepper, pickers and option cards SHALL stack without horizontal scroll.

## Success Criteria

- [x] The section is no longer "coming soon" anywhere (home, sidebar, section page), and shows 1 of 1 page written.
- [x] The framework stepper changes its per-stage content when the sample product changes, and moves between all stages.
- [x] The requirements and trade-off references change their content with the chosen product/decision.
- [x] The page passes axe in light and dark themes, works at 360 px without horizontal scroll, and is fully keyboard-operable.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

- Requested as the section's opening page: the design method as the spine the case studies reference.
- Deliberately different shape from the JWT/XSS pages: reasoning, diagrams and trade-off tables with client-side interactive references, no server lab, because the content is a method rather than a mechanism to run.
- Sample products used by the interactive pieces are the four the section summary already names (news feed, autocomplete, chat, design system), so the method and the coming case studies line up.

## Baseline

### Current Behavior

- The handbook has four sections; Frontend System Design is listed everywhere as "coming soon" with no route and no pages.

### Gaps / Limitations

- No guidance exists on how to approach a frontend system-design problem, which is the senior skill the section is meant to teach.

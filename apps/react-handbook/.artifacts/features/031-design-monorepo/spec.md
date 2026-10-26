---
id: "031"
feature: design-monorepo
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-20
---

# Feature: Frontend System Design, Design a frontend monorepo

## Overview

A case study for the System Design section on the architecture of the codebase
rather than a screen: "several frontend apps (a marketing site, a web app, an
admin tool) share UI, utilities and config. Design the repository they live
in." Senior and staff interviews ask about this more and more, and it is the
everyday reality of most frontend platform teams. Yet the decisions that make
a monorepo work (task graphs, affected builds, caching, module boundaries,
dependency policy, CI) are rarely shown working.

Like the other case studies, it applies the design method end to end:
requirements, architecture, then deep dives and trade-offs. It stays
tool-neutral. It teaches the concepts and compares the common workspace and
task-runner tools side by side instead of tying the page to one. Every demo is
a client-side model of a sample repository, labelled as one example with at
least one named alternative.

## Goals

- [x] The page can be opened in one click from the sidebar, the Frontend System Design section page and the home card (the section shows 4 of 4 pages written), and the design-method page lists it among the case studies.
- [x] The page applies the method to a frontend monorepo end to end, so a senior engineer sees a complete worked answer covering the four deep dives: the affected graph with caching, boundaries and ownership, dependencies and versioning, and CI and developer experience.
- [x] Each deep dive has an interactive reference whose output changes with what the reader does, and every figure is labelled as one example with at least one named alternative.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Running real workspace or build tools in the browser | The site can't run package managers or task runners; demos model a fixed sample repo, labelled "simplified" |
| A tutorial or setup guide for one specific tool | The page stays tool-neutral; tools are compared, not taught |
| Micro-frontends in depth (runtime composition, module federation) | Named as an alternative to a monorepo in the trade-offs, not designed |
| Restructuring this site's own repository into a monorepo | This is a learning page, not a change to the project |
| The remaining case studies (chat, design system) | Their own later features |

## User Stories

### P1: Reach the page

- As a learner, I want the case study listed and linked so that I can open it from the section and from the method page.
- **Why P1:** Nothing is usable without the route and navigation.
- **Independent Test:** From the home System Design card, open the section, then this page. The method page lists it among the case studies.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home card, the sidebar or the section page is shown THEN the page SHALL be listed and counted (System Design: 4 of 4 written), and the design-method page and the other case studies' "next" pointers SHALL list it.
- [x] AC-002: WHEN the page opens THEN it SHALL show breadcrumbs (Home, Frontend System Design, page), title, intro and a topic list linking to its topics.

### P1: Requirements and architecture

- As a learner, I want the monorepo's requirements and a high-level architecture so that I see the method's first stages applied to a codebase instead of a screen.
- **Why P1:** The case study must start where the method says to start.
- **Independent Test:** Read the scoped requirements and see a diagram of the sample repo's apps, shared packages and tooling layers with their dependency arrows.

**Acceptance Criteria:**

- [x] AC-003: WHEN the requirements topic is shown THEN it SHALL list functional requirements (share code across apps, change a shared package and every consumer updates together, build/test/lint per project), non-functional requirements (CI time that grows slower than the repo, clear ownership, safe releases, onboarding) and explicit scope cuts.
- [x] AC-004: WHEN the architecture topic is shown THEN it SHALL present a diagram of the sample repo (apps, shared packages such as UI, utilities and config, and the workspace and task-runner layer), readable in light and dark, and SHALL compare monorepo, polyrepo and micro-frontends as alternatives.
- [x] AC-005: WHEN the architecture topic is shown THEN it SHALL include a tool-neutral comparison of common workspace and task-runner tools across the same set of capabilities (workspaces, task graph, local and remote cache, affected detection, boundary enforcement, code generation), labelled as of its research date.

### P1: Deep dive — the affected graph and caching

- As a learner, I want to change a package and see which projects must rebuild and which come from cache so that "affected" and "task caching" become concrete.
- **Why P1:** The task graph and cache are what make a large monorepo's CI fast. It is the most-probed decision.
- **Independent Test:** Mark a leaf package as changed and see only its dependents marked affected; mark a shared base package as changed and see almost everything affected. Run the pipeline twice and see the second run come from cache.

**Acceptance Criteria:**

- [x] AC-006: WHEN the reader marks one or more packages as changed THEN the demo SHALL highlight the changed packages and every project that depends on them directly or indirectly as affected, and SHALL show the rest as unaffected.
- [x] AC-007: WHEN the reader runs a task (build, test or lint) THEN the demo SHALL run tasks in dependency order (a package's build before its dependents' builds), run independent tasks in parallel, and report per task whether it ran or was a cache hit, with a total simulated time compared against running everything.
- [x] AC-008: WHEN the reader runs the same task again with no changes THEN every task SHALL be a cache hit; WHEN they change a package's source, or an input that only affects some tasks, THEN only tasks whose inputs changed SHALL miss the cache.
- [x] AC-009: WHEN the reader switches between a local cache and a shared (remote) cache THEN the demo SHALL show a second machine (such as CI or a teammate) getting hits from the shared cache that it can't get from a local one.

### P1: Deep dive — boundaries and ownership

- As a learner, I want to try imports between projects and see which ones the boundary rules allow so that I understand how a monorepo keeps from turning into a tangle.
- **Why P1:** Without enforced boundaries a monorepo becomes one big coupled app. Interviewers probe it.
- **Independent Test:** Pick an import from one project to another; an allowed import passes, a forbidden one (an app importing another app, a UI package importing the data layer, a deep import into a package's internals) is rejected with the rule it breaks.

**Acceptance Criteria:**

- [x] AC-010: WHEN the reader picks a source project and a target to import THEN the demo SHALL say whether the import is allowed and, if not, name the rule it breaks (layer rules such as app → feature → UI → utilities, no app-to-app imports, public entry points only, no cycles).
- [x] AC-011: WHEN the boundaries topic is shown THEN it SHALL explain ownership (each project has owners who must review changes to it), internal packages vs published packages, and public entry points vs deep imports.
- [x] AC-012: WHEN the reader adds an import that would create a cycle THEN the demo SHALL reject it and show the cycle path.

### P1: Deep dive — dependencies and versioning

- As a learner, I want to see how third-party dependencies and internal versions are managed so that I can defend a dependency policy.
- **Why P1:** Version drift, duplicated libraries and broken releases are the everyday pain of shared code.
- **Independent Test:** Switch between a single-version policy and per-project versions and see duplicated copies and drift appear or disappear. Make a change to a shared package and see which packages get a version bump and a changelog entry.

**Acceptance Criteria:**

- [x] AC-013: WHEN the reader switches between a single-version policy and independent per-project versions of a third-party library THEN the demo SHALL show how many copies get installed and where versions drift, and the topic SHALL explain the trade-off (upgrade everyone at once vs upgrade each project on its own).
- [x] AC-014: WHEN the topic is shown THEN it SHALL explain workspace linking of internal packages, hoisting, and phantom dependencies (using a package you never declared), with an example of how one goes wrong.
- [x] AC-015: WHEN the reader records a change to a package with a bump type (patch, minor, major) THEN the demo SHALL show the resulting version bumps, including dependents that need a bump because a dependency they publish against changed, and a generated changelog entry; it SHALL contrast fixed (lockstep) and independent versioning.

### P1: Deep dive — CI and developer experience

- As a learner, I want to see how CI time grows with the repo under different strategies so that I can argue for affected runs, caching and parallelism.
- **Why P1:** "Won't CI get slow?" is the first objection to any monorepo.
- **Independent Test:** Grow the sample repo's project count and compare CI time for run everything, affected only, and affected with a shared cache and parallel agents.

**Acceptance Criteria:**

- [x] AC-016: WHEN the reader changes the repo size and the share of projects a typical change touches THEN the demo SHALL chart estimated CI time for each strategy (run everything, affected only, affected + shared cache, + parallel agents), labelled as a model with its assumptions shown.
- [x] AC-017: WHEN the CI topic is shown THEN it SHALL cover developer experience: running one app without building the world, incremental type checking across packages, code generators for new packages, and editor performance in a large repo, each with a trade-off.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-018: WHEN a topic is shown THEN it SHALL end with a short "read more" linking reputable references (the tools' official docs, well-known engineering write-ups), and the page SHALL point back to the method and on to the remaining case studies.

## Edge Cases

- WHEN no package is marked as changed THEN the affected demo SHALL show nothing affected and a run SHALL be all cache hits (or nothing to run), not an error.
- WHEN every package is marked as changed THEN the affected demo SHALL show everything affected, and the run SHALL still respect dependency order.
- WHEN the reader picks the same project as source and target of an import THEN the boundaries demo SHALL treat it as allowed (an internal import) and say so.
- WHEN the reader records a major bump on a base package THEN the versioning demo SHALL show the knock-on bumps to every published dependent.
- WHEN the CI model's inputs are at their extremes (smallest repo, every change touching everything) THEN the chart SHALL still render, and the strategies SHALL converge as expected.
- WHEN the reader uses only the keyboard THEN every control (package toggles, task runner, import picker, bump picker, sliders) SHALL be operable and clearly focused.
- WHEN the page is viewed at 360 px THEN the diagrams, graph, tables and controls SHALL stack or scroll inside their own region without page-level horizontal scroll.

## Success Criteria

- [x] Changing a leaf package marks only its dependents affected; changing a base package marks nearly everything; a repeat run with no changes is entirely cache hits, and a second machine gets hits only with the shared cache.
- [x] Each forbidden import in the boundaries demo is rejected with the rule it breaks, and a cycle shows its path.
- [x] Switching dependency policy changes the installed-copy count, and recording a change produces the expected bumps and changelog entry.
- [x] The CI chart responds to repo size and change share, and the four strategies are ordered as the model predicts.
- [x] The page passes axe in light and dark themes, works at 360 px without horizontal scroll, and is fully keyboard-operable.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

- Fourth case study of the System Design section. It shows the method still works when the "product" is a codebase: users are the engineers, and non-functional requirements are CI time, ownership and release safety.
- Same shape as the other case studies: reasoning, a diagram and client-side interactive references over one fixed sample repo shared by all demos, no server lab.
- Tool facts (capabilities and behavior of the compared tools) are researched and dated before writing, never stated from memory.
- Feature 032 adds a seventh topic, best practices for structure, layers and code owners, with a repo-tree explorer and a CODEOWNERS tester.

## Baseline

### Current Behavior

- Frontend System Design has three pages (the design method, Design a news feed, Design an autocomplete). The section and the case studies point to a chat app and a design system as the next case studies; there is no page on how a frontend codebase is organised.

### Gaps / Limitations

- No case study covers codebase architecture, so task graphs, affected builds, caching, module boundaries, dependency policy and CI scaling aren't shown.

---
id: "031"
feature: design-monorepo
created: 2026-10-20
---

# Technical Design: Design a frontend monorepo

## Scope

In scope: a fourth System Design topic page `monorepo`
(`/system-design/monorepo`) with six topics. Every demo runs on one shared,
pure model of a sample repository (`acme`, 10 projects). The page adds a
theme-aware architecture diagram drawn from that model, a capability matrix
for the tools, an affected-graph + task-runner + cache simulation, a boundary
checker, a dependency-policy + release simulation, and a CI-time model with a
chart. The other System Design pages and the section summary are updated to
link it. No server code, no new dependency.

Out of scope: see spec.

## Research Summary

> From .artifacts/research/monorepo-tooling.md

- Three layers, one tool each: package manager (pnpm/npm/Yarn workspaces), task runner (Turborepo 2.11, Nx 23.3), release tool (Changesets 3.0, `nx release`).
- Turborepo and Nx hash a task's inputs (files, config, lockfile entries, declared env); a hit restores `outputs` and replays logs. Per-task dependency-hash chaining is assumed (Turborepo docs don't state it outright), so the page says "simplified".
- pnpm's isolated layout (default `nodeLinker: isolated`) blocks phantom dependencies; `catalog:` gives a single-version policy; `workspace:*` becomes the exact version on publish.
- Changesets: dependents whose range the new version leaves get a patch bump; since 3.0 (2026-08) peer dependencies also give a patch, not a major. `fixed` groups bump together.
- `turbo boundaries` is experimental; Nx's `enforce-module-boundaries` is the mature boundary rule. CODEOWNERS: last matching pattern wins.
- Unverified cells (npm `workspace:` protocol on npm 12, Rush/Lerna/Yarn details) were left out of the matrix or named only in prose.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Topic page | catalog entry + route + content with `Topic`/`Toc` | a bespoke page shell | `src/app/(playground)/system-design/autocomplete/page.tsx:1`, `src/handbook/system-design/autocomplete.tsx:28` |
| Pickers / toggles / verdicts | `Choice`, `Toggle`, `Verdict` | new radio/checkbox primitives | `src/handbook/jwt/token-view.tsx:127`, `src/handbook/ui.tsx:10,40` |
| Theme-aware SVG | Tailwind `fill-card stroke-border fill-foreground` on SVG nodes, `<title>`/`<desc>` | raw hex colors | `src/handbook/system-design/autocomplete-architecture.tsx:3` |
| Tinted text contrast | `text-[color-mix(in_oklch,var(--x),black_25-35%)] dark:text-x` | `text-muted-foreground` on `bg-muted` | `src/handbook/system-design/tradeoffs-demo.tsx:25` |
| Wins/costs cards | `grid sm:grid-cols-2` cards with Wins/Costs `dl` | prose walls | `src/handbook/system-design/tradeoffs-demo.tsx:30` |
| Scrollable tables | plain `<table>` inside a `relative` focusable region | shadcn `Table` wrapper inside own scroller | knowledge feature:014/026 gotchas |
| Handlers | named `handleX`; one-line inline only | multi-line inline handlers | `.claude/rules/react-handbook/05-event-handlers.md` |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `Topic`, `Toc` | `src/handbook/topic.tsx:8`, `src/handbook/toc.tsx` | six topics, `linksLabel: "Read more:"` |
| `TopicFrame` | `src/components/playground/topic-frame.tsx` | page header + breadcrumbs |
| `Choice` | `src/handbook/jwt/token-view.tsx:127` | every single-choice control (repo size, change share, policy, bump type, task) |
| `Toggle`, `Verdict` | `src/handbook/ui.tsx:10,40` | package "changed" toggles, allowed/rejected verdict |
| `Button` | `src/components/ui/button.tsx` | run / record actions |
| `topicHref` | `src/practices/catalog.ts` | links back to the method and other case studies |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| TopicPage (catalog) | add the `monorepo` page |
| Project | one app or package of the sample repo |
| Task / TaskRun | one (project, task) node in the task graph and its simulated run |
| Cache | content-addressed set of task hashes per machine + a shared one |
| BoundaryCheck | result of a proposed import |
| ReleasePlan | version bumps + changelog from a recorded change |
| CiEstimate | minutes per strategy for given repo size and change share |

#### TopicPage — `src/practices/catalog.ts:200-206`

- `section` ("system-design"), `slug` ("monorepo"), `title`, `summary`, `written: true`. Appended after `autocomplete` (`catalog.ts:273-278`); `TopicSlug` (`catalog.ts:317`) derives from it.

#### Project — `monorepo/repo.ts` (new, client-safe)

- `id` (string, e.g. `"ui"`), `path` (`"packages/ui"`), `name` (`"@acme/ui"`), `kind` (`app | feature | ui | data | util | config`), `deps` (ids of internal dependencies), `owners` (CODEOWNERS team), `published` (bool), `version` (semver, published only), `exports` (public subpaths), `durations` per task (simulated seconds).

Sample repo (10 projects):

| id | kind | deps |
|----|------|------|
| web, admin, marketing | app | web → auth, billing, ui, utils; admin → auth, ui, api, utils; marketing → ui, utils |
| auth, billing | feature | auth → ui, api, utils; billing → auth, ui, api, utils |
| ui | ui | utils |
| api | data | utils |
| utils | util | — |
| tsconfig, eslint-config | config | every other project depends on both (dev tooling) |

#### Task / TaskRun — `monorepo/runner.ts`

- Tasks `build | test | lint`. Graph: `build` and `test` of a project depend on `build` of each internal dep (`^build`); `lint` has no task deps.
- Hash inputs (simplified, mirrors the researched tools): task name, project's source revision, its config inputs (tsconfig revision for build/test, eslint-config revision for lint), and the hashes of the dep `build` tasks it depends on. FNV-1a over the input string, shown as 8 hex chars, labelled "simplified".
- `TaskRun`: `{ project, task, hash, status: "ran" | "hit", start, end }` from a list scheduler with N workers.

#### Cache

- `Map<machine, Set<hash>>` for local caches (`laptop`, `ci`) plus `remote: Set<hash>`. Mode `local | shared`. A hit if the hash is in that machine's local set or (shared and in remote); every run writes local (and remote when shared).

#### BoundaryCheck — `monorepo/boundaries.ts`

- Input `{ from, to, entry: "root" | "subpath" | "deep" }`. Output `{ allowed, violations: { rule, message }[], cycle?: string[], reviewers: string[] }`.
- Rules: layer matrix (app → feature/ui/data/util; feature → feature/ui/data/util; ui → util; data → util; util → none; any → config), no app-to-app, public entry points only (`deep` rejected), no cycles (would the new edge `from → to` close a path `to ⇝ from`).
- `from === to` → allowed, "internal import".

#### ReleasePlan — `monorepo/versioning.ts`

- Changeset `{ package, bump, summary }`; mode `independent | fixed`. Output: `{ package, from, to, reason: "changeset" | "dependency" | "fixed group" }[]` + changelog markdown. Exact dependent-bump rules come from the research cache.
- Policy demo data: per-project third-party version of one library under `independent` vs `single` (catalog) policy, counting installed copies and drift. Phantom-dependency example: flat (hoisted) vs isolated layout, outcome before/after `ui` drops an undeclared transitive dependency.

#### CiEstimate — `monorepo/ci-model.ts`

- Inputs: project count (10, 50, 200, 1000), change share (5%, 20%, 50%, 100%). Assumptions shown: 3 tasks × 1 min per project, 4 cores per agent, graph depth ~ log2(projects) + 2, shared-cache hit rate 60% of affected tasks, 6 agents, fixed setup 1.5 min, cache restore 0.05 min per task.
- Strategies: everything = setup + N·T/C; affected = setup + s·N·T/C; affected+cache = setup + s·N·T·(1−h)/C + restore; +agents = setup + max(s·N·T·(1−h)/(C·A), critical path). All floored at the critical path where it applies.

### API Contracts

None (no server).

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-001 | listed + counted | `src/practices/catalog.ts:259-278` | no | must add entry |
| AC-001 | method page link | `src/handbook/system-design/content.tsx:125-136` | no | must add |
| AC-001 | other case studies' "next" | `src/handbook/system-design/news-feed.tsx:174`, `autocomplete.tsx:157` | no | must add |
| AC-002 | breadcrumbs/title/intro | `src/components/playground/topic-frame.tsx` | yes | none |
| AC-003..018 | case-study content and demos | none | no | new |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Six topics: requirements + architecture, choosing the tooling, affected graph + caching, boundaries + ownership, dependencies + versioning, CI + DX | Method order; the tool comparison gets its own topic so its demo can be interactive (pick capabilities → which tools cover them) |
| The graph draws only ui → utils and api → utils of the utils edges, with a label | Every code project depends on utils directly; drawing all eight arrows hid the rest of the graph (checked in the browser) |
| One shared, pure sample-repo model drives every demo and the diagram | Consistency: the graph the reader sees in the architecture is the one they change, import into and release |
| Demos compute synchronously; the run is shown as a timeline, not animated | Deterministic and testable; timing is simulated seconds, labelled |
| "Changed" toggles are revisions: toggling off restores the main revision | Shows the cache is content-addressed: reverting a change gets hits again |
| eslint-config is a project in the graph whose revision is only a lint input | Shows "affected" is coarse (everything depends on it) while the cache is precise (only lint misses) — AC-008's "input that only affects some tasks" |
| Two machines (laptop, CI) with local vs shared cache | Smallest model that shows why a remote cache matters (AC-009) |
| Choice radios instead of sliders for repo size and change share | No slider primitive in the repo; discrete steps are keyboard-friendly and easy to compare |
| CI chart as inline SVG (lines over repo size, one per strategy, plus a value table) | No chart library; a table carries the same numbers for screen readers |
| Files in `src/handbook/system-design/monorepo/` | Twelve new files; a subfolder keeps the flat system-design folder readable |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Catalog | `src/practices/catalog.ts` | modify | add `monorepo` page; section summary mentions it |
| Method / case studies | `system-design/content.tsx`, `news-feed.tsx`, `autocomplete.tsx` | modify | list the monorepo case study |
| README | `README.md` | modify | System Design row |
| Page route | `src/app/(playground)/system-design/monorepo/page.tsx` | new | `TopicFrame` + `MonorepoHandbook` |
| Content | `system-design/monorepo/content.tsx` | new | intro, TOC, six `Topic`s, next |
| Repo model | `monorepo/repo.ts` | new | projects, kinds, layer order, revisions |
| Graph logic | `monorepo/graph.ts` | new | dependents closure, topo order, path search |
| Runner | `monorepo/runner.ts` | new | task graph, hashing, scheduler, caches |
| Boundaries | `monorepo/boundaries.ts` | new | rule checks, cycle path, reviewers |
| Versioning | `monorepo/versioning.ts` | new | release plan, changelog, policy + phantom data |
| CI model | `monorepo/ci-model.ts` | new | estimates per strategy |
| Tools data | `monorepo/tools.ts` | new | capability matrix from research (pnpm, npm, Turborepo, Nx, Changesets) |
| Repo graph SVG | `monorepo/repo-graph.tsx` | new | layered graph with optional state per node (AC-004, AC-006) |
| Architecture demo | `monorepo/architecture-demo.tsx` | new | diagram + monorepo/polyrepo/micro-frontends cards |
| Tools demo | `monorepo/tools-demo.tsx` | new | capability filter + matrix (AC-005) |
| Affected demo | `monorepo/affected-demo.tsx` | new | AC-006..009 |
| Boundaries demo | `monorepo/boundaries-demo.tsx` | new | AC-010, AC-012 |
| Versioning demo | `monorepo/versioning-demo.tsx` | new | AC-013..015 |
| CI demo | `monorepo/ci-demo.tsx` | new | AC-016 |

## Data Flow

Pure client. Affected demo: toggles → revisions → `affected(changed)` (reverse
closure) highlights the graph; Run(task, scope, machine) → task graph for the
selected projects (plus their dependency builds) → hashes → per task check
cache → list scheduler (4 workers, hits take 0.2 s) → timeline + totals →
write caches. Boundaries: (from, to, entry) → rules → verdict + cycle path +
reviewers. Versioning: changeset list → release plan → bumps table +
changelog. CI: (size, share) → estimates → chart + table.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | catalog, method, case-study links, README | `catalog.ts`, `content.tsx`, `news-feed.tsx`, `autocomplete.tsx` | Done |
| AC-002 | route + content | `monorepo/page.tsx`, `monorepo/content.tsx` | Done |
| AC-003 | content | `monorepo/content.tsx` | Done |
| AC-004 | repo graph + architecture demo | `repo-graph.tsx`, `architecture-demo.tsx` | Done |
| AC-005 | tools data + demo | `tools.ts`, `tools-demo.tsx` | Done |
| AC-006 | graph logic + affected demo | `graph.ts`, `affected-demo.tsx` | Done |
| AC-007 | runner + affected demo | `runner.ts`, `affected-demo.tsx` | Done |
| AC-008 | runner hashing | `runner.ts` | Done |
| AC-009 | runner caches + machine switch | `runner.ts`, `affected-demo.tsx` | Done |
| AC-010 | boundaries | `boundaries.ts`, `boundaries-demo.tsx` | Done |
| AC-011 | content | `monorepo/content.tsx` | Done |
| AC-012 | cycle check | `boundaries.ts`, `graph.ts` | Done |
| AC-013 | policy data + demo | `versioning.ts`, `versioning-demo.tsx` | Done |
| AC-014 | content + phantom example | `content.tsx`, `versioning-demo.tsx` | Done |
| AC-015 | release plan | `versioning.ts`, `versioning-demo.tsx` | Done |
| AC-016 | CI model + chart | `ci-model.ts`, `ci-demo.tsx` | Done |
| AC-017 | content | `monorepo/content.tsx` | Done |
| AC-018 | read more + next | `monorepo/content.tsx` | Done |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | none in repo; scratchpad script compiled with `tsc --module commonjs` (knowledge feature:027) |
| Command | `pnpm typecheck && pnpm lint && pnpm build` + scratch check |
| Location | scratchpad (not committed) |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| graph/runner | scratch `check.ts` | leaf change → only dependents affected; utils change → all non-config affected; repeat run all hits; eslint-config change → only lint misses; revert → hits; laptop then CI: local misses, shared hits; schedule respects deps |
| boundaries | scratch | app→app, ui→api, deep import rejected with rule; auth→billing cycle path; same project allowed |
| versioning | scratch | bumps match researched changesets rules; fixed mode bumps the group |
| ci-model | scratch | strategies ordered everything ≥ affected ≥ +cache ≥ +agents; 100% share → affected = everything |
| Browser | Puppeteer | listed 4/4; demos react; keyboard; axe light + dark; 360 px |

## Considerations

### Error Handling

- Pure client, fixed inputs; empty selections render an explicit "nothing affected / nothing to run" state, never throw. `DemoStage` boundary catches anything unexpected.

### Security

- No server, no free-text input except the changeset summary, which is rendered as text (no HTML).

## Open Questions

- [ ] None.

---
id: "033"
feature: design-micro-frontends
created: 2026-10-20
---

# Technical Design: Design micro frontends

## Scope

In scope: a fifth System Design topic page `micro-frontends`
(`/system-design/micro-frontends`) with six topics. Every demo runs on one
shared, pure model of a sample store (`Shopfront`: a shell and three team-owned
micro frontends). The page adds a theme-aware architecture diagram, a fit
questionnaire (its own topic, so the page has seven), a composition timeline with a properties table and a tool list,
a shared-dependency negotiation simulator, a route-ownership and event-contract
demo, a release / rollback / failure-isolation page mock, and a style-leak demo
that runs real CSS in real shadow trees. The other System Design pages and the
section summary are updated to link it. No server code, no new dependency.

Out of scope: see spec.

## Research Summary

> From .artifacts/research/micro-frontends.md

- Module Federation picks the highest version in the share scope that satisfies a consumer's `requiredVersion` (default: the range in its `package.json`). Not singleton: no match falls back to the consumer's own copy (`strictVersion` defaults to true when a fallback exists); with `strictVersion: false` it warns and uses the highest. Singleton: one version; a mismatch warns, or throws with `strictVersion: true`; an already-loaded copy is never replaced by a higher one (webpack 5.112 runtime source; MF 2.0 behaves the same).
- MF 2.0 (`@module-federation/enhanced` 2.9.2): manifest, runtime remotes, runtime plugins, `shareStrategy` `version-first` (default) vs `loaded-first`. Share `react-dom/` with a trailing slash or subpaths duplicate React DOM.
- Next.js: `nextjs-mf` is in maintenance mode, Pages Router only; the docs recommend Multi-Zones (separate apps per path set, `assetPrefix`, `rewrites`, hard navigation across zones).
- Import maps are in every evergreen browser; single-spa 6.0.3 is stable, 7.0 in beta. Podium is maintained, Tailor archived, ESI is a 2001 W3C Note, Cloudflare's web-fragments is pre-1.0.
- Shadow DOM blocks selectors both ways; inherited properties and custom properties cross; `::part` exposes chosen elements.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Topic page | catalog entry + route + server `content.tsx` with `Topic`/`Toc` | a bespoke page shell | `src/app/(playground)/system-design/monorepo/page.tsx:1`, `src/handbook/system-design/monorepo/content.tsx:31` |
| Pure model next to demos | `*.ts` models with no React, demos as `"use client"` leaves | logic inside components | `src/handbook/system-design/monorepo/boundaries.ts:1` |
| Pickers / toggles / verdicts | `Choice`, `Toggle`, `Verdict` | new radio/checkbox primitives | `src/handbook/jwt/token-view.tsx:146`, `src/handbook/ui.tsx:10,40` |
| Theme-aware SVG | Tailwind `fill-card stroke-border fill-foreground`, `<title>`/`<desc>` | raw hex colors | `src/handbook/system-design/monorepo/repo-graph.tsx:1` |
| Timeline bars | table rows with a positioned bar and sr-only "from x to y" text | canvas or color-only charts | `src/handbook/system-design/monorepo/affected-demo.tsx:160` |
| Wins/costs cards | `grid md:grid-cols-3` cards with Wins/Costs `dl` | prose walls | `src/handbook/system-design/monorepo/architecture-demo.tsx:38` |
| Scrollable tables | plain `<table>` inside a `relative` focusable `role="region"` | shadcn `Table` wrapper inside own scroller | knowledge feature:014 gotchas |
| Tinted text contrast | `text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning` | `text-muted-foreground` on `bg-muted` | `src/handbook/system-design/monorepo/tools-demo.tsx:19` |
| Handlers | named `handleX`; one-line inline only | multi-line inline handlers | `.claude/rules/05-event-handlers.md` |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `Topic`, `Toc` | `src/handbook/topic.tsx:8`, `src/handbook/toc.tsx` | six topics, `linksLabel: "Read more:"` |
| `TopicFrame` | `src/components/playground/topic-frame.tsx` | page header and breadcrumbs |
| `Choice` | `src/handbook/jwt/token-view.tsx:146` | every single-choice control |
| `Toggle`, `Verdict` | `src/handbook/ui.tsx:10,40` | isolation toggle, slow toggles, pass/fail verdicts |
| `LevelMark` pattern | `src/handbook/system-design/monorepo/tools-demo.tsx:11` | yes / partly / no cells (copied locally, it isn't exported) |
| `Button`, `Input`, `Label` | `src/components/ui/*` | release / roll back actions, URL input |
| `topicHref` | `src/practices/catalog.ts` | links to the method and other case studies |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| TopicPage (catalog) | add the `micro-frontends` page |
| Piece | the shell or one team-owned micro frontend of the sample store |
| FitAnswers / FitResult | questionnaire input and recommendation with reasons |
| Approach | one composition approach: properties, timeline steps, tools |
| ShareConsumer / ShareResult | one piece's provided version and accepted range; resolved version per piece |
| Route / RouteMatch | URL prefix ownership and the result for a path |
| Contract / ContractChange | the `cart:item-added` event and a change to it; per-listener result |
| Release / PageOutcome | per-piece version history and health; what each slot shows |

#### TopicPage: `src/practices/catalog.ts:200`

- `section` ("system-design"), `slug` ("micro-frontends"), `title` ("Design micro frontends"), `summary`, `written: true`. Appended after `monorepo` (`catalog.ts:279-285`).

#### Piece: `micro-frontends/store.ts` (new)

- `id` (`shell | catalog | checkout | account`), `name`, `team`, `owns` (route prefixes), `slot` (where it renders on the product page), `kb` (simulated JS size), `version`.

Sample store: the platform team's shell (header with cart badge, nav, layout,
routing), catalog (home, search, product pages), checkout (cart, checkout
steps, also the "mini cart" on the product page), account (orders, profile,
and the "recently viewed" widget on the product page). The product page
therefore mixes three pieces, which is what makes composition interesting.

#### FitAnswers: `micro-frontends/fit.ts` (new)

- `teams` (`one | few | many`), `blocking` (`rarely | sometimes | often`), `frameworks` (`one | migrating | several`), `layout` (`pages` each team owns whole pages, or `mixed` pieces on one page), `seo` (bool), `budget` (`tight | normal`).
- `recommend(answers)` returns `{ verdict: "one-app" | "modular" | "micro-frontends", approach?: ApproachId, reasons: string[], warnings: string[] }`.

Rules, in order: one team → one app. Rare blocking and one framework → a
modular monolith in a monorepo. Otherwise micro frontends: whole pages per team
→ route-level split; mixed pieces with SEO → server or edge composition; mixed
without SEO → client runtime composition; migrating → route-level split around
the legacy app first. A tight budget with runtime composition adds a warning
about shared dependencies.

#### Approach: `micro-frontends/composition.ts` (new)

- `id` (`route | build | server | edge | client | iframe`), `name`, `summary`, `properties` (record of six property ids to `{ level: yes | partial | no, note }`), `steps` (timeline steps `{ label, start, end, kind: network | server | script | render }`), `firstContent` (ms).
- Steps are computed from shared assumptions (`ASSUMPTIONS`: round trip, server render time, script parse per kB, data fetch time) so the caption can print them.

#### ShareConsumer: `micro-frontends/sharing.ts` (new)

- Input: per piece `{ provides: version, accepts: range }`, options `{ singleton, strictVersion }`, library (`framework` stateful or `utility` stateless).
- Output: per piece `{ uses: version | "own copy", status: ok | warning | error, message }`, `copies`, `extraKb`, and a failure explanation when two copies of the stateful library load.
- Semver: a small local `satisfies(version, range)` for the forms the demo offers (`^x.y.z`, `~x.y.z`, `x.y.z`); the negotiation rules come from the research file.

#### Route and Contract: `micro-frontends/routing.ts` (new)

- `ROUTES`: prefix → piece. `matchRoute(path)` returns `{ piece, prefix, subpath }` or the shell's not-found result. Normalises a missing leading slash, query strings and trailing slashes.
- `CONTRACT_V1`: `{ sku: string, quantity: number, price: number }`. `CHANGES`: none, add field, rename field, remove field, change type. `LISTENERS`: shell header reads `quantity`; checkout mini cart reads `sku`, `quantity`, `price`.
- `deliver(change)` returns the payload sent and, per listener, `{ works, shown, reason }`, plus `compatible` for the change.

#### Release: `micro-frontends/deploy.ts` (new)

- `Build` `{ version, kind: good | crash | contract }`. State per piece: history stack of builds, `slow` flag. `release(state, piece, kind)` pushes a new minor version; `rollback(state, piece)` pops back to the previous build. The shell's manifest is the top of each stack.
- `outcome(state, isolation)` returns per slot `{ shows: content | fallback | wrong | waiting | blank, note }`, a page-level result (`ok | degraded | down`), and which non-functional requirement each result meets or breaks. Without isolation a crash takes the whole page down (an uncaught render error unmounts the root) and a slow piece holds the page; with isolation the boundary shows a fallback and a timeout releases the rest. A contract build renders but shows wrong data either way.

### Relationships

All models read `store.ts`. The architecture diagram, composition timeline,
routing demo and deploy demo use the same piece ids and slots.

### API Contracts

None. No server code.

## Decisions

| Decision | Rationale |
|----------|-----------|
| Model everything client side over one fixed store | Same as the other case studies; the site can't host separate origins or a federation runtime |
| Styling demo runs real CSS inside an outer shadow root that acts as the "page" | Real browser behaviour (leaks, inheritance, custom properties crossing the boundary) without the demo's broad rules leaking into the site itself |
| Shadow-root contents use plain CSS with the site's custom properties | Tailwind classes can't reach into a shadow tree; the theme tokens (`--primary`, `--foreground`, ...) inherit in, so light and dark keep working. This is itself a point the topic makes |
| Leak verdicts read `getComputedStyle` after render | The verdict reports what the browser actually applied, not what the model expects |
| Six composition approaches including route-level split | The route-level split (separate apps per path) is the most common good answer and must sit next to runtime composition |
| Fit demo as rules with listed reasons | A senior answer argues with criteria; showing the reasons is the lesson |
| Contract demo with two listeners reading different fields | Shows a change can be breaking for one consumer and harmless for another |
| Deploy demo ties health to builds | Release a broken build, see the effect, roll back only that piece |
| Diagram as a server component SVG | Static content stays out of the client bundle |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| catalog entry | `src/practices/catalog.ts` | modify | page entry, section summary |
| route | `src/app/(playground)/system-design/micro-frontends/page.tsx` | new | `TopicFrame` + handbook |
| `MicroFrontendsHandbook` | `src/handbook/system-design/micro-frontends/content.tsx` | new | intro, six topics, closing note (server) |
| store | `micro-frontends/store.ts` | new | pieces, teams, slots |
| `StoreDiagram` | `micro-frontends/store-diagram.tsx` | new | SVG: shell composing three pieces, teams and pipelines (server) |
| `ArchitectureDemo` | `micro-frontends/architecture-demo.tsx` | new | diagram + single app / modular monolith / micro frontends cards (server) |
| fit | `micro-frontends/fit.ts` | new | `recommend` |
| `FitDemo` | `micro-frontends/fit-demo.tsx` | new | questionnaire + recommendation (client) |
| composition | `micro-frontends/composition.ts` | new | approaches, properties, timelines, tools |
| `CompositionDemo` | `micro-frontends/composition-demo.tsx` | new | approach picker, timeline, properties (client) |
| `ToolTable` | `micro-frontends/tool-table.tsx` | new | tools per approach with research date (server-safe) |
| sharing | `micro-frontends/sharing.ts` | new | semver subset + negotiation |
| `SharingDemo` | `micro-frontends/sharing-demo.tsx` | new | per-piece versions and ranges, options, result (client) |
| routing | `micro-frontends/routing.ts` | new | routes, contract, changes, delivery |
| `RoutingDemo` | `micro-frontends/routing-demo.tsx` | new | URL owner + event flow + contract change (client) |
| deploy | `micro-frontends/deploy.ts` | new | builds, release, rollback, outcome |
| `DeployDemo` | `micro-frontends/deploy-demo.tsx` | new | manifest, release controls, page mock (client) |
| `StylingDemo` | `micro-frontends/styling-demo.tsx` | new | real CSS in shadow roots, computed-style verdicts (client) |
| next pointers | `content.tsx`, `news-feed.tsx`, `autocomplete.tsx`, `monorepo/content.tsx`, `monorepo/architecture-demo.tsx` | modify | link the new page |
| README | `README.md` | modify | section table |

## Data Flow

1. The route renders `TopicFrame` with the server `content.tsx`.
2. Each demo is a client leaf holding only its own UI state; on every change it calls its pure model and renders the result (no effects, derived in render), except the styling demo, which reads computed styles in a layout effect after the shadow content renders.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | catalog entry, next pointers | `catalog.ts`, system-design pages | Done |
| AC-002 | route, content | `page.tsx`, `content.tsx` | Done |
| AC-003 | topic 01 points | `content.tsx` | Done |
| AC-004 | `ArchitectureDemo`, `StoreDiagram` | `architecture-demo.tsx`, `store-diagram.tsx` | Done |
| AC-005 | `FitDemo`, `recommend` | `fit-demo.tsx`, `fit.ts` | Done |
| AC-006 | `CompositionDemo` timeline | `composition-demo.tsx`, `composition.ts` | Done |
| AC-007 | `CompositionDemo` properties | `composition-demo.tsx`, `composition.ts` | Done |
| AC-008 | tool table | `tool-table.tsx` | Done |
| AC-009 | `SharingDemo` | `sharing-demo.tsx`, `sharing.ts` | Done |
| AC-010 | stateful vs stateless explanation | `sharing-demo.tsx`, `sharing.ts` | Done |
| AC-011 | topic 03 points | `content.tsx` | Done |
| AC-012 | URL owner | `routing-demo.tsx`, `routing.ts` | Done |
| AC-013 | event flow + styles comparison | `routing-demo.tsx` | Done |
| AC-014 | contract change | `routing-demo.tsx`, `routing.ts` | Done |
| AC-015 | release / roll back | `deploy-demo.tsx`, `deploy.ts` | Done |
| AC-016 | page outcome | `deploy-demo.tsx`, `deploy.ts` | Done |
| AC-017 | topic 05 points | `content.tsx` | Done |
| AC-018 | `StylingDemo` leaks | `styling-demo.tsx` | Done |
| AC-019 | shadow boundary readout | `styling-demo.tsx` | Done |
| AC-020 | topic 06 points | `content.tsx` | Done |
| AC-021 | read more + closing note | `content.tsx` | Done |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | none in the repo; scratch script compiled with `tsc --module commonjs` (as in 031) |
| Command | `pnpm typecheck && pnpm lint && pnpm build` + scratch model checks + browser checks |
| Location | scratchpad (not committed) |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| fit | scratch | one team → one app; rare blocking → modular; mixed + SEO → server/edge; mixed no SEO → client; pages → route |
| sharing | scratch | all compatible → 1 copy; incompatible + singleton → warning; + strict → error; no singleton → 2 copies and extra kB |
| routing | scratch | each prefix, nested path, unknown → not found, normalisation; each contract change per listener |
| deploy | scratch | release changes one version; rollback restores; crash with/without isolation; slow; contract build |
| page | browser (Puppeteer) | every demo responds, styling leak verdicts in both themes, axe light/dark, 360 px no horizontal scroll, keyboard |

## Considerations

### Error Handling

- Inputs are pickers; the only free text is the URL field, which the matcher normalises and which falls back to not-found.

### Security

- No user content is injected into the shadow-root styles; they are fixed strings.

## Open Questions

- [ ] None

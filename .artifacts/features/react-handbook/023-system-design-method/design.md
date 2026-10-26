---
id: "023"
feature: system-design-method
created: 2026-10-12
---

# Technical Design: Frontend System Design section, the design method

## Scope

In scope: activate the `system-design` section (catalog, path, sidebar folder,
section route, home card) and write its first page `method`
(`/system-design/method`) with three topics and three client-side interactive
references. No server code, no new dependency.

Out of scope: the case-study pages; any backend.

## Research Summary

Knowledge chain: codebase → established handbook patterns. The method follows
the widely used frontend interview framework (requirements → architecture →
data model → interface/API → optimisations → trade-offs; "RADIO"-style), framed
for the browser. No external API is used, so no research cache is needed.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Reference |
|---------|-------------|-----------|
| Topic page | catalog entry + route + `src/handbook/{slug}/content.tsx` with `Topic`/`Toc` | `src/app/(playground)/security/jwt/page.tsx` |
| Section activation | `SectionId`, `sections[]`, `SECTION_PATH`, `topicPages[]`, sidebar `topicFolder` | `src/practices/catalog.ts`, `src/components/playground/app-sidebar.tsx` |
| Demo frame | `DemoStage` via `Topic`'s `demo` slot; unique `label` per demo | `src/handbook/topic.tsx` |
| Pickers | `Choice` radio group, `Toggle` | `src/handbook/jwt/token-view.tsx`, `src/handbook/ui.tsx` |
| Handlers | named `handleX`; one-line inline only | `.claude/rules/react-handbook/05-event-handlers.md` |
| Theme tokens, no raw colour | `bg-muted`, `text-foreground/80`, `text-info` | existing handbook pages |

### Existing Code to Reuse

| Component | Location | How |
|-----------|----------|-----|
| `Topic`, `Toc` | `src/handbook/topic.tsx`, `toc.tsx` | the three topics |
| `TopicFrame`, `SectionIndex`, `sectionMetadata` | `src/components/playground/*` | header + section route (generic over `TopicSectionId`) |
| `Choice` | `src/handbook/jwt/token-view.tsx` | product picker, decision picker, stage nav |
| `Toggle` | `src/handbook/ui.tsx` | reveal/hide requirement groups |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| TopicPageMeta (catalog) | add `method` page; activate `system-design` |
| Stage (client data) | one step of the framework |
| Product (client data) | a sample product with per-stage notes and requirements |
| Decision (client data) | a recurring trade-off with its options |

#### Catalog changes — `src/practices/catalog.ts`

- `SECTION_PATH: Record<TopicSectionId, string>` — `catalog.ts:290`ish; add `system-design`.
- `TopicSectionId = Exclude<SectionId, "react-practices" | "system-design">` — `catalog.ts:190`; change to `Exclude<SectionId, "react-practices">` so `system-design` becomes a topic section.
- `sections[]` `system-design` — `catalog.ts:51`; set `href: SYSTEM_DESIGN_PATH` (add the const).
- `sectionProgress` — `catalog.ts:286`; remove the `if (id === "system-design") return null;` line so it counts pages.
- `topicPages[]` — append `{ section: "system-design", slug: "method", title, summary, written: true }`.
- `app-sidebar.tsx` `FOLDERS` — add `topicFolder("system-design")`.

Removing `system-design` from `TopicSectionId`'s exclusion makes `sectionPath`,
`sectionPages`, `sectionProgress`, `topicFolder`, `SectionIndex` all handle it
with no further change (typecheck enforces the `SECTION_PATH` entry).
`upcomingSections` in `practice-nav.tsx` becomes empty and renders nothing.

#### Stage / Product / Decision (client only, `framework.ts`, no `server-only`)

- `Stage = { id; name; produce: string[]; mistakes: string[] }`
- `Product = { id; name; brief; stageNotes: Record<stageId, string>; functional: string[]; nonFunctional: { axis; note }[]; questions: string[] }` for the four products (feed, autocomplete, chat, design-system)
- `Decision = { id; name; servesAxes: string[]; options: { name; what; wins; costs }[] }` for rendering, data-fetching/caching, pagination, state location, realtime transport

### API Contracts

None (no server).

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Exposed? | Gap |
|-------|-------|--------------------|----------|-----|
| AC-001 | section open, 1/1, card, sidebar | `catalog.ts` `sections`/`sectionProgress`/`topicPages`; `app-sidebar.tsx` | partial (coming-soon) | activate section |
| AC-002 | breadcrumbs/title/intro | `topic-frame.tsx` | yes (generic) | none |
| AC-003..010 | framework/requirements/trade-off content | none | no | new client data + demos |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Activate `system-design` by widening `TopicSectionId` rather than special-casing | It then flows through every generic helper; one special-case (`sectionProgress`) is removed, not added |
| No server code; interactive pieces are client-only references | The content is a method, not a mechanism to run; a fake lab would mislead. Figures labelled "example" (AC-005) |
| Three topics mirror the handbook shape: Framework, Requirements, Trade-offs | Matches the other Security/Browser pages; the framework stepper is the spine, the other two go deep on the two hardest stages |
| One shared client dataset (`framework.ts`) drives all three demos | Products and decisions stay consistent across the page and reusable by future case-study pages |
| Sample products are the four the section summary names | The method lines up with the case studies to come; the stepper's worked notes become those pages' starting points |
| Stepper state is local `useState`; product/decision are `Choice` radio groups | Simple, keyboard-operable, no URL/state library; matches event-handler and a11y rules |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Catalog | `src/practices/catalog.ts` | modify | activate section + add `method` page |
| Sidebar | `src/components/playground/app-sidebar.tsx` | modify | `topicFolder("system-design")` |
| Home copy | `src/app/(playground)/page.tsx` | modify | drop "System Design is on the way" phrasing if present |
| Playground spec | `.artifacts/features/react-handbook/001-practice-playground/spec.md` | modify | note System Design now has content |
| Section route | `src/app/(playground)/system-design/page.tsx` | new | `SectionIndex` |
| Page route | `src/app/(playground)/system-design/method/page.tsx` | new | `TopicFrame` + `DesignMethodHandbook` |
| Data | `src/handbook/system-design/framework.ts` | new | `STAGES`, `PRODUCTS`, `DECISIONS` |
| Content | `src/handbook/system-design/content.tsx` | new | intro, TOC, three `Topic`s, read-more |
| Framework demo | `src/handbook/system-design/framework-demo.tsx` | new | AC-003..005 stepper + product picker |
| Requirements demo | `src/handbook/system-design/requirements-demo.tsx` | new | AC-006..007 |
| Trade-offs demo | `src/handbook/system-design/tradeoffs-demo.tsx` | new | AC-008..009 |

## Data Flow

Pure client: a `Choice` selects a product or decision → the demo reads the
matching record from `framework.ts` → renders stage notes / requirement groups /
option cards. The stepper holds the current stage index in `useState`.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | catalog, sidebar | `catalog.ts`, `app-sidebar.tsx` | Planned |
| AC-002 | page route, content | `system-design/method/page.tsx`, `content.tsx` | Planned |
| AC-003 | framework data, demo | `framework.ts`, `framework-demo.tsx` | Planned |
| AC-004 | framework demo | `framework-demo.tsx` | Planned |
| AC-005 | framework demo, content | `framework-demo.tsx`, `content.tsx` | Planned |
| AC-006 | requirements demo | `requirements-demo.tsx` | Planned |
| AC-007 | content | `content.tsx` | Planned |
| AC-008 | trade-offs demo | `tradeoffs-demo.tsx` | Planned |
| AC-009 | content | `content.tsx` | Planned |
| AC-010 | content read-more | `content.tsx` | Planned |

## Test Strategy

| Aspect | Detail |
|--------|--------|
| Gate | `pnpm typecheck && pnpm lint && pnpm build` |
| Browser | Puppeteer MCP: section no longer "coming soon"; stepper changes per-stage content when product changes and moves across stages; requirement/decision pickers change content; axe light + dark; 360 px no overflow; keyboard. |

## Considerations

### Error Handling

- Pure client data, no fetch; default selections so no panel is empty.
- Illustrative content labelled "example" to avoid implying a single right answer.

### Security

- No server, no user input beyond selecting from fixed options; nothing to validate at a trust boundary.

## Open Questions

- [ ] None.

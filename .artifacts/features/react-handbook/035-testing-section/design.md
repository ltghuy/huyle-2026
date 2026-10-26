---
id: "035"
feature: testing-section
created: 2026-10-21
---

# Technical Design: Testing section + "Testing strategy"

## Scope

In: the seventh section `testing` (catalog, icon, sidebar folder, home copy and
references, README), its section index, a fallback route for its three
unwritten pages, and the page `/testing/strategy` with five topics and five
demos, plus one small route handler the test-doubles demo calls.
Out: the content of the other three pages (036 to 038).

## Research Summary

No new library. Sources the page cites (checked before linking):

- Martin Fowler, "The Practical Test Pyramid" and "Mocks Aren't Stubs" (martinfowler.com)
- Kent C. Dodds, "The Testing Trophy and Testing Classifications" (kentcdodds.com)
- Testing Library, "Guiding Principles" (testing-library.com)
- Google Testing Blog, "Flaky Tests at Google and How We Mitigate Them" (testing.googleblog.com)
- Mock Service Worker docs, for request-level fakes (mswjs.io)

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Topic page | Server `content.tsx` with `TOPICS`, `Toc`, one `Topic` per topic, client demos as leaves | A client component for the whole page | src/handbook/security/content.tsx:14 |
| Route | `TopicFrame` + `topicMetadata(slug)` | Custom headers | src/app/(playground)/security/jwt/page.tsx:1 |
| Section | `SectionIndex` + `sectionMetadata` | | src/app/(playground)/security/page.tsx:1 |
| Unwritten pages | `[slug]` fallback with `generateStaticParams` of unwritten pages | 404s for planned pages | git 0652f0c `under-the-hood/[slug]/page.tsx` |
| "Read more" | `advice` (Do/Avoid) + `links` with `linksLabel: "Read more:"` | A new disclosure component | src/handbook/security/content.tsx:23 |
| Demo controls | `Choice` radios, `Toggle` cards, `Button`, `Verdict` (icon + word) | Colour-only pass/fail | src/handbook/jwt/token-view.tsx:127, src/handbook/ui.tsx:10 |
| API route | Thin handler, Zod on input, `jsonError` 422 | Logic in the handler | src/app/api/handbook/cache/route.ts:1 |
| Handlers | `handleX`, one-line inline only | Multi-line inline handlers | .claude/rules/react-handbook/05-event-handlers.md |
| Models | Labelled "simplified model", assumptions shown | Presenting a model as measured | knowledge.md feature:017 |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `Topic`, `Toc` | src/handbook/topic.tsx:9, src/handbook/toc.tsx:4 | import |
| `Choice` | src/handbook/jwt/token-view.tsx:127 | import |
| `Toggle`, `Verdict` | src/handbook/ui.tsx:10, src/handbook/ui.tsx:44 | import |
| `TopicFrame`, `SectionIndex`, `PageDates` | src/components/playground/ | import |
| shadcn `Button`, `Input`, `Select`, `Table` parts | src/components/ui/ | import |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| `SectionId`, `sections`, `SECTION_PATH` | add `testing` |
| `TopicPageMeta`, `topicPages` | add four rows; dates only on written pages |
| `findTopicPage` (new helper) | look up a page by section and slug for the fallback route |
| Price sample variants (new, client) | one implementation per change, its source text, and spy counters |
| Suite model (new, client) | per-level time, flake chance, upkeep, and the sample bug list |
| Cases (new, client) | the classification exercise data |
| Search contract (new, shared schema) | v1 and v2 response shapes, used by the route and by the request-level fake |
| Pipeline model (new, client) | check kinds with durations, stages |

#### Catalog members touched

- `SectionId` -- src/practices/catalog.ts:10
- `UNDER_THE_HOOD_PATH` (neighbour for the new `TESTING_PATH`) -- src/practices/catalog.ts:25
- `sections` -- src/practices/catalog.ts:27
- `TopicPageMeta` -- src/practices/catalog.ts:232 (becomes a union: written pages carry `created` and `updated`, unwritten pages carry neither)
- `topicPages` -- src/practices/catalog.ts:244
- `SECTION_PATH` -- src/practices/catalog.ts:403
- `sectionProgress` -- src/practices/catalog.ts:434 (generic, no change)
- `ICONS` -- src/components/playground/section-icon.tsx:5
- `FOLDERS` -- src/components/playground/app-sidebar.tsx:29

### API Contracts

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| /api/handbook/testing/search | GET | `q` (string, 0 to 40 chars), `shape` (`v1` or `v2`) | v1 `{ items: { id, name }[] }`, v2 `{ results: { sku, title }[] }`; 422 on bad params |

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-001 | section progress | src/practices/catalog.ts:434 `sectionProgress` | yes (generic) | none |
| AC-003 | page date | src/components/playground/topic-frame.tsx `PageDates` | yes | none |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Section id `testing`, title "Testing", path `/testing`, icon lucide `FlaskConical` | Short and matches the reader's word; flask reads as "experiment/test" |
| Page slugs: `strategy` (written), `e2e-playwright`, `bdd-cucumber`, `ab-testing` | Readable URLs; the three later pages are listed now so the section shows the whole plan |
| Unwritten pages are linked and open a "being written" placeholder via `testing/[slug]` (spec AC-002 updated to match) | Same as Under the Hood while it was being written; keeps the sidebar and index uniform |
| A 20-line in-page test harness (`test`, `expect(...).toBe/toEqual/toThrow`, spies) runs the sample tests | Real assertions run in the browser with no test library in the bundle; failures are caught and shown, never thrown |
| Sample variants are real functions with their source text beside them, not evaluated strings | No `eval`/`new Function` (keeps CSP options open); the source shown is short and reviewed against the function |
| Test-doubles demo: the app code under test expects v1; the learner flips the server to v2. Mock = canned v1 object in the test; request-level fake = builds its reply with the shared contract module, which the server also uses; real = calls the route | Shows the actual lesson: a fake built from the shared contract changes with the server, a hand-written mock does not |
| Suite shape model is closed-form and deterministic: run time, `1 - (1 - p)^n` flake chance, upkeep, and per-bug catch chance `1 - (1 - q)^n` over the levels able to catch it | Instant, explainable, assumptions listed in a table under the chart |
| Classification uses one `Choice` per case with a "Check" step per case, then a summary | Keyboard friendly; no drag and drop |
| Pipeline model: a `Select` per check kind choosing its stage; outputs time to first feedback, unchecked kinds, and a warning when pre-commit work passes 30 s | Simple controls that work at 360 px |
| Number inputs for counts (with visible labels and min/max), not sliders | Exact values, easier by keyboard; matches the other demos |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| catalog | src/practices/catalog.ts | modify | section, four pages, dates union, `findTopicPage` |
| SectionIcon | src/components/playground/section-icon.tsx | modify | `FlaskConical` |
| AppSidebar | src/components/playground/app-sidebar.tsx | modify | `topicFolder("testing")` |
| Home | src/app/(playground)/page.tsx | modify | copy mentions testing; references group "Testing" |
| README | README.md | modify | section row |
| Section route | src/app/(playground)/testing/page.tsx | new | `SectionIndex` |
| Page route | src/app/(playground)/testing/strategy/page.tsx | new | `TopicFrame` + content |
| Fallback route | src/app/(playground)/testing/[slug]/page.tsx | new | placeholder for unwritten pages |
| Search contract | src/server/handbook/testing-search.schema.ts | new | params schema, product list, `shapeResponse(items, shape)` |
| Search service | src/server/handbook/testing-search.service.ts | new | filter products, shape the reply |
| Search route | src/app/api/handbook/testing/search/route.ts | new | parse, call service, respond |
| Harness | src/handbook/testing/harness.ts | new | `runTests`, `expect`, `spyOn` |
| StrategyHandbook | src/handbook/testing/content.tsx | new | intro, Toc, five Topics |
| Price sample | src/handbook/testing/price-sample.ts | new | variants, sources, the two test sets |
| WhyTestDemo | src/handbook/testing/why-test-demo.tsx | new | pick a change, see results per test style |
| Suite model | src/handbook/testing/suite-model.ts | new | levels, bugs, presets, maths |
| ShapesDemo | src/handbook/testing/shapes-demo.tsx | new | counts, presets, outputs, assumptions |
| Cases | src/handbook/testing/cases.ts | new | exercise data |
| ClassifyDemo | src/handbook/testing/classify-demo.tsx | new | place, check, summary |
| DoublesDemo | src/handbook/testing/doubles-demo.tsx | new | cut point, server shape, run, results |
| Pipeline model | src/handbook/testing/pipeline-model.ts | new | kinds, stages, maths |
| PipelineDemo | src/handbook/testing/pipeline-demo.tsx | new | stage selects, outputs |
| TestResults | src/handbook/testing/test-results.tsx | new | shared pass/fail list (icon + word + message) |

## Data Flow

1. The server renders `content.tsx` text; each demo hydrates as a client leaf.
2. Why test: pick a change → the variant's functions are passed to both test sets → `runTests` returns `{ name, pass, message }[]` → `TestResults` renders, plus a callout naming false alarms and missed bugs.
3. Shapes: counts or preset → `suite-model.ts` computes outputs → render (no async).
4. Classify: per case choice → check → reveal recommendation; summary counts placed cases.
5. Doubles: choose server shape → "Run" runs the same test three ways: mock (canned v1), fake (`shapeResponse` from the shared contract with the chosen shape), real (fetch `/api/handbook/testing/search?shape=…`) → results.
6. Pipeline: stage per kind → `pipeline-model.ts` → render.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | catalog, SectionIcon, Home | catalog.ts, section-icon.tsx, page.tsx | Planned |
| AC-002 | AppSidebar, section route, fallback route | app-sidebar.tsx, testing/page.tsx, testing/[slug]/page.tsx | Planned |
| AC-003 | Page route, TopicFrame, Toc | testing/strategy/page.tsx, content.tsx | Planned |
| AC-004, AC-005 | WhyTestDemo, price sample, harness | why-test-demo.tsx, price-sample.ts, harness.ts | Planned |
| AC-006 | StrategyHandbook | content.tsx | Planned |
| AC-007 | ShapesDemo, suite model | shapes-demo.tsx, suite-model.ts | Planned |
| AC-008, AC-009 | ClassifyDemo, cases | classify-demo.tsx, cases.ts | Planned |
| AC-010 | StrategyHandbook | content.tsx | Planned |
| AC-011 | DoublesDemo, search contract, service, route | doubles-demo.tsx, testing-search.*.ts, search/route.ts | Planned |
| AC-012 | PipelineDemo, pipeline model | pipeline-demo.tsx, pipeline-model.ts | Planned |
| AC-013 | StrategyHandbook | content.tsx (advice + links per topic) | Planned |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | none in the repo yet; checks run in a real browser (Puppeteer MCP) plus `curl` for the route |
| Command | `pnpm typecheck && pnpm lint && pnpm build` |

### Checks

- Every sample bug fails at least one behaviour test; every refactor passes all behaviour tests (SC-1), scripted in the page.
- Shapes model: all counts zero shows "nothing caught" and no NaN.
- Doubles: with v2, mock passes, fake and real fail; with v1, all pass.
- Route: `curl` with valid and invalid params (200 / 422).
- axe in light and dark, 360 px width with no horizontal scroll, keyboard use of every control.

## Considerations

- Error handling: the harness catches exceptions per test; the real-server run shows a network error as a failed test with its message.
- Security: the route only reads two validated query params and returns fixed data; no state, nothing stored.
- Cloudflare: no module-level mutable state in the route (knowledge: per-isolate state).
- Accessibility: results use icon plus word; result lists update in an `aria-live="polite"` region; light-mode contrast avoids muted text on muted backgrounds.

## Open Questions

- None

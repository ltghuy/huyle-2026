---
id: 026
feature: under-the-hood-pipeline
created: 2026-10-13
---

# Technical Design: Under the Hood section + "From source to bundle"

## Scope

In: the sixth section `under-the-hood` (catalog, icon, sidebar folder, home
copy, README), a section index, a fallback route for its four unwritten pages,
and the page `/under-the-hood/build-pipeline` with five topics and five demos.
Out: the four later pages' content (027-030).

## Research Summary

> From .artifacts/research/build-toolchains.md

- CRA 5 = webpack 5 + Babel + fork-ts-checker; sunset 2025-02-14.
- Vite 8 = Oxc transform/minify, Rolldown bundle + dep pre-bundle, Lightning CSS minify; dev serves source as native ESM; no type-check.
- Next 16 = Turbopack (dev + build default) + SWC; `next build` runs `tsc` in parallel.
- Bundlers interleave resolve/transform; automatic JSX runtime adds a `react/jsx-runtime` import only after transform.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Topic page | Server `content.tsx` with `TOPICS`, `Toc`, `Topic` per topic, client demos as leaves | Whole page as client component | src/handbook/rendering/content.tsx:13 |
| Route | `TopicFrame` + `topicMetadata(slug)` | Custom headers | src/app/(playground)/browser-platform/rendering/page.tsx:1 |
| Section | `SectionIndex` + `sectionMetadata` | — | src/app/(playground)/browser-platform/page.tsx:1 |
| Demo controls | `Choice` radio fieldset, `Toggle` checkbox card, `Button` | Hand-rolled tabs (use shadcn Tabs) | src/handbook/jwt/token-view.tsx:127, src/handbook/ui.tsx:10 |
| Handlers | Named `handleX`, one-line inline only | Multi-line inline handlers | .claude/rules/05-event-handlers.md |
| Simplified models | Label output "simplified" | Presenting a model as a real tool's output | knowledge.md feature:017 |
| Catalog summaries | Plain hyphens | Literal `—` | knowledge.md feature:025 |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `Topic`, `Toc` | src/handbook/topic.tsx, src/handbook/toc.tsx | import |
| `Choice` | src/handbook/jwt/token-view.tsx:127 | import (second section to use it; leave in place, note in knowledge) |
| `Toggle`, `Verdict` | src/handbook/ui.tsx | import |
| `TopicFrame`, `SectionIndex` | src/components/playground/ | import |
| shadcn `Table`, `Button`, `Textarea` | src/components/ui/ | import; add `tabs` via CLI |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| `SectionId` / `sections` / `SECTION_PATH` | add `under-the-hood` |
| `topicPages` | add 5 rows (`build-pipeline` written; `transpiling`, `bundlers`, `css-pipeline`, `react-internals` not written) |
| `Toolchain` (new, client-safe data) | per setup: name, note, deprecated?, rows of `{ job, dev, prod }` |
| `SAMPLE` (new) | virtual project files + per-stage artifacts (strings) |
| `HashModel` (new) | source modules → chunk contents → SHA-256 names |

#### Catalog members touched

- `SectionId` -- src/practices/catalog.ts:10
- `sections` -- src/practices/catalog.ts:27
- `topicPages` -- src/practices/catalog.ts:198
- `SECTION_PATH` -- src/practices/catalog.ts:278
- `ICONS` -- src/components/playground/section-icon.tsx:5
- `FOLDERS` -- src/components/playground/app-sidebar.tsx:29

### API Contracts

None. All demos are client-side; the timing demo reads the browser's own Resource Timing entries.

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-001 | section progress | src/practices/catalog.ts:313 `sectionProgress` | yes (generic) | none |
| AC-003 | sidebar topic total | src/components/playground/app-sidebar.tsx:63 `topicPages.length` | yes (generic) | none |
| AC-015 | transferSize / encodedBodySize / decodedBodySize | PerformanceResourceTiming (browser) | yes | none |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Section id `under-the-hood`, title "Under the Hood", icon lucide `Cog` | Matches the reader's framing ("what happens under the hood"); covers both build tooling and React internals |
| Demos are client-side models over a fixed sample; stage artifacts are hand-written strings checked against real tool behavior | The site runs on Cloudflare Workers (no native webpack/SWC); real tools in the browser would add MBs. Fixed sample keeps outputs exact; labelled "simplified" |
| Sizes in stages/modes demos are real: UTF-8 bytes via `TextEncoder`, gzip via `CompressionStream` | Real numbers for the shown text, no fabricated figures |
| Hash demo uses SubtleCrypto SHA-256, first 8 hex | Real content hashing in the browser; note that tools use other hash functions |
| Hash model: chunks `runtime`, `vendor`, `main`, `about`; runtime holds the chunk-name map of lazy chunks; toggles "split vendor" and "split runtime" | Reproduces the real cache-busting cascade (runtime manifest inlined in main changes main when a lazy chunk changes) |
| Fallback `under-the-hood/[slug]` route for unwritten pages (generateStaticParams of unwritten), like `react-practices/[slug]` | Section index and sidebar link every page; avoids 404 for planned pages |
| Toolchain table: mobile = stacked cards per job (`dl`), sm+ = table | No horizontal scroll at 360 px |
| Stepper: ordered list of stage buttons with `aria-current="step"`, Back/Next/Restart, live region announcing "Stage n of 5: name" | Keyboard and screen-reader friendly progress indicator |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| catalog | src/practices/catalog.ts | modify | section + 5 pages |
| SectionIcon | src/components/playground/section-icon.tsx | modify | `Cog` |
| AppSidebar | src/components/playground/app-sidebar.tsx | modify | `topicFolder("under-the-hood")` |
| Home | src/app/(playground)/page.tsx | modify | copy mentions build tools; references group "Build tools" |
| README | README.md | modify | section row |
| Section route | src/app/(playground)/under-the-hood/page.tsx | new | `SectionIndex` |
| Page route | src/app/(playground)/under-the-hood/build-pipeline/page.tsx | new | `TopicFrame` + content |
| Fallback route | src/app/(playground)/under-the-hood/[slug]/page.tsx | new | unwritten pages placeholder |
| Tabs | src/components/ui/tabs.tsx | new (CLI) | file switching |
| BuildPipelineHandbook | src/handbook/build-pipeline/content.tsx | new | intro, Toc, 5 Topics |
| toolchain data | src/handbook/build-pipeline/toolchains.ts | new | facts from research |
| ToolchainDemo | src/handbook/build-pipeline/toolchain-demo.tsx | new | setup picker + table/cards |
| sample data | src/handbook/build-pipeline/sample.ts | new | files, stage artifacts, dev/prod outputs |
| CodePanel / sizes | src/handbook/build-pipeline/code-panel.tsx, sizes.ts | new | filename header, `pre`, byte + gzip size |
| StagesDemo | src/handbook/build-pipeline/stages-demo.tsx | new | stepper, input/output panels |
| ModesDemo | src/handbook/build-pipeline/modes-demo.tsx | new | dev/prod switch, property checklist, NODE_ENV steps |
| hashing model | src/handbook/build-pipeline/hashing.ts | new | chunk assembly + SHA-256 |
| HashingDemo | src/handbook/build-pipeline/hashing-demo.tsx | new | edit files, toggles, changed/same names |
| LoadedDemo | src/handbook/build-pipeline/loaded-demo.tsx | new | Resource Timing table |

## Data Flow

1. Server renders `content.tsx` text; each demo hydrates as a client leaf.
2. Stages/modes: pick stage/mode → look up artifact strings in `sample.ts` → `sizes.ts` computes bytes/gzip async (latest-wins) → render.
3. Hashing: textarea edits → `hashing.ts` assembles chunks per toggles → SHA-256 each (runtime last, since it embeds lazy-chunk names; main embeds runtime when not split) → compare with previous names → render changed/same.
4. Loaded: button → `performance.getEntriesByType("resource")` filtered to `/_next/static/` → rows + totals.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | catalog, SectionIcon, Home | catalog.ts, section-icon.tsx, page.tsx | Planned |
| AC-002 | Section route, fallback route | under-the-hood/page.tsx, [slug]/page.tsx | Planned |
| AC-003 | AppSidebar | app-sidebar.tsx | Planned |
| AC-004..006 | ToolchainDemo | toolchain-demo.tsx, toolchains.ts | Planned |
| AC-007..010 | StagesDemo | stages-demo.tsx, sample.ts | Planned |
| AC-011..012 | ModesDemo | modes-demo.tsx, sample.ts | Planned |
| AC-013..014 | HashingDemo | hashing-demo.tsx, hashing.ts | Planned |
| AC-015..016 | LoadedDemo | loaded-demo.tsx | Planned |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | none in repo; quality gate + browser verification (Puppeteer/Chrome + axe-core), as in prior features |
| Command | `pnpm typecheck && pnpm lint && pnpm build` |
| Location | scratch scripts outside the repo |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| hashing.ts | scratch node script | edit About with runtime split → runtime+about change only; runtime inlined → main+about change; edit App → main only; upgrade react with vendor split → vendor only |
| Page | browser | each demo interaction, axe light/dark, 360 px no overflow, keyboard |

## Considerations

### Error Handling

- `CompressionStream` / `crypto.subtle` missing → show "unavailable" text (subtle requires secure context; localhost and HTTPS are secure).
- No Resource Timing entries (e.g. buffer cleared) → explain instead of empty table.

### Security

- No user input leaves the browser; code panels render text, never HTML.

## Open Questions

- None

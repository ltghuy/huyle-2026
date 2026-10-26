---
id: "046"
feature: seo-at-scale
created: 2026-10-22
---

# Technical Design: SEO, SEO at scale

## Scope

In: `e2e/specs/seo.spec.ts` in the existing Playwright suite, one full recorded run; the page `/seo/seo-at-scale` with five topics and five demos; catalog, README and section copy marking it written; the Crawling page's rules demo switched from a placeholder page to an SEO lab page.
Out: hreflang on this site, a CI pipeline, Lighthouse, Search Console or IndexNow calls (see spec).

## Research Summary

> From .artifacts/research/seo-at-scale.md (checked 2026-10-22)

- hreflang: three equivalent methods; each version lists itself and all others; one-way links are ignored; ISO 639-1 plus optional ISO 3166-1 region (`UK` ignored, region alone invalid); absolute URLs; Google detects language from content; avoid automatic locale redirects (Googlebot sends no `Accept-Language`).
- Next.js: `alternates.languages` accepts `x-default`; a page's `alternates` replaces the layout's; the sitemap example omits the self-reference; the type accepts `en-UK`.
- Migrations: server-side 301/308 straight to the final URL, 404/410 for no equivalent, keep at least a year, Change of Address is domain-level for 180 days, fluctuation for "a few weeks or more". `permanent: true` sends 308.
- Facets: robots.txt or fragments to keep them out; `&` separators, consistent order and 404 for empty combinations if indexable; pagination self-canonical, `rel=next/prev` unused by Google.
- Spam: scaled content abuse "no matter how it's created", doorway abuse, site reputation abuse; AI use is fine unless the purpose is manipulating rankings.
- Monitoring: reverse and forward DNS or published IP files for Googlebot; Crawl Stats groups; crawl budget wording; 500/503/429 for no more than 1 to 2 days; URL Inspection API reads only the indexed version (2,000 a day); Lighthouse 13.5 SEO audits; IndexNow engines exclude Google.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Topic page | `TopicFrame` + content with `Topic`, `topic(i)`, `linksLabel: "Read more:"` | A custom shell | src/handbook/seo/ai-search/content.tsx |
| E2E spec | `import { expect, test } from "../fixtures"`, `test.describe`, plain-English titles | A second runner | e2e/specs/debounced-search.spec.ts:1 |
| Sorter | `Choice` radios + Check button + `Verdict`, score in an `aria-live` box | Drag and drop | src/handbook/seo/claims-demo.tsx:16 |
| Quoted code | `CodeTabs` with `suiteFile(path)` | Pasting code into the page | src/handbook/e2e/code-tabs.tsx:11, suite.ts |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `LAST_RUN`, `suiteFile`, `OUTCOME_LABEL` | src/handbook/e2e/suite.ts | Monitoring demo (server component) |
| `Verdict`, `Choice` | src/handbook/ui, src/handbook/jwt/token-view.tsx:127 | Status marks and sorter radios |
| `FetchError` | src/handbook/seo/crawling/fetch-error.tsx | Live redirect check |
| `FieldSelect` | src/handbook/seo/field-select.tsx | Facet and strategy pickers |
| `AI_BOTS`, `tokensFor` | src/lib/ai-bots.ts | Spec asserts the training bots are blocked |

## Data Model

| Entity | Purpose |
|--------|---------|
| hreflang model (new, client) | parse a text cluster (`URL code` lines, indented `code URL` alternates), check codes, self-reference, return links, absolute URLs, `x-default`; matrix |
| redirect model (new, client) | parse `old new [code]` and `old 410` lines plus a list of new-site URLs and old URLs; resolve with loop detection; findings per old URL |
| facet model (new, client) | a sample catalogue of 24 products with colour, size and brand; a filter order; strategies `robots`, `fragment`, `indexable`; URL, normalized URL, combination counts, crawlability, status, canonical |
| scale cases (new) | 8 cases with category (`fine`, `scaled`, `doorway`, `reputation`), reason and source |
| SEO spec (new, e2e) | request-level checks; no browser pages needed |

## Decisions

| Decision | Rationale |
|----------|-----------|
| The SEO spec uses Playwright's `request` fixture and reads HTML as text | It's what crawlers get; 49 URLs run in seconds without a browser |
| One test per check group, looping over sitemap URLs with `expect.soft` and the URL in each message | One failing page doesn't hide others, and the message names it |
| Redirect check with `maxRedirects: 0` | The browser can't read a 308; the request API can |
| Run the full suite once to record | The reporter rewrites the whole record; a partial run would drop the other specs from the Testing pages |
| Hreflang input as plain text lines | Easy to edit and to paste the samples; parsed line by line with line numbers |
| Language codes: the full ISO 639-1 list; region codes: two letters, with `UK`, `EU` and `UN` flagged | Matches Google's rules without a library |
| Live redirect check in the migration demo uses `fetch` and reads `redirected` and the final URL | Browsers hide redirect status codes; the spec covers the 308 |
| Crawling page rules demo: `/seo-lab/server` replaces the placeholder row | No placeholder pages remain; the lab page shows the header case (042 AC-011 updated) |
| Keep the `seo/[slug]` fallback route with an empty param list | Ready for future pages; the build accepts an empty list (checked) |

## Component Design

| Component | File | Action |
|-----------|------|--------|
| SEO spec | e2e/specs/seo.spec.ts | new |
| hreflang | src/handbook/seo/scale/hreflang.ts, hreflang-demo.tsx | new |
| Migration | src/handbook/seo/scale/redirects.ts, migration-demo.tsx | new |
| Facets | src/handbook/seo/scale/facets.ts, facets-demo.tsx | new |
| Cases | src/handbook/seo/scale/cases.ts, cases-demo.tsx | new |
| Monitoring | src/handbook/seo/scale/tests-demo.tsx | new (server) |
| Content + route | src/handbook/seo/scale/content.tsx, src/app/(playground)/seo/seo-at-scale/page.tsx | new |
| Catalog, README | src/practices/catalog.ts, README.md | modify |
| Crawling rules demo, copy | src/handbook/seo/crawling/rules-demo.tsx, crawling/content.tsx | modify |

## Requirements Traceability

| Requirement | File | Status |
|-------------|------|--------|
| AC-001, AC-002 | e2e/specs/seo.spec.ts | Done |
| AC-003 | last-run.json (recorded) | Done |
| AC-004, AC-005 | content.tsx, hreflang.ts, hreflang-demo.tsx | Done |
| AC-006, AC-007 | content.tsx, redirects.ts, migration-demo.tsx | Done |
| AC-008, AC-009 | content.tsx, facets.ts, facets-demo.tsx | Done |
| AC-010, AC-011 | content.tsx, cases.ts, cases-demo.tsx | Done |
| AC-012, AC-013 | content.tsx, tests-demo.tsx | Done |
| AC-014 | content.tsx | Done |

## Test Strategy

- `pnpm test:e2e`: all specs and scenarios pass with the SEO spec; break one canonical temporarily and confirm a failing message naming the URL, then revert and record a clean run.
- Browser: each demo's samples and edge cases; the Crawling rules demo; axe light and dark, 360 px; quality gates.

## Considerations

- The spec runs against the production build the suite serves on port 3100, so it checks what ships.
- Pasted text is parsed and shown as text only.

## Open Questions

- None

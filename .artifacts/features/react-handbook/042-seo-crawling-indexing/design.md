---
id: "042"
feature: seo-crawling-indexing
created: 2026-10-22
---

# Technical Design: SEO, Crawling and indexing control

## Scope

In: `app/robots.ts`, `app/sitemap.ts`, `metadataBase` and a canonical URL on every route, `noindex` on placeholder pages, an `X-Robots-Tag` header on `/api/*`, and the page `/seo/crawling-indexing` with five topics and five demos.
Out: AI crawler rules (page 5), social cards and JSON-LD (page 4), CI checks (page 6).

## Research Summary

> From .artifacts/research/seo-fundamentals.md (sections added 2026-10-22)

- robots.txt: most specific user-agent group; longest matching path; least restrictive rule on a tie; `*` and `$`; paths case-sensitive; 500 KiB; cached up to 24 hours; 4xx means no rules, 5xx pauses crawling.
- Sitemaps: 50,000 URLs or 50 MB; absolute canonical URLs; `priority` and `changefreq` ignored; `lastmod` used when accurate.
- Robots rules: the full rule list, header for non-HTML, more restrictive wins, unreadable behind a robots.txt block.
- Status codes: 10 redirect hops; 301/308 strong, 302/307 weak; 4xx except 429 treated alike; 429/5xx slow crawling.
- Next.js 16: `robots.ts` and `sitemap.ts` are cached route handlers; `metadataBase` resolves relative canonicals; layout metadata is inherited; `notFound()` adds `noindex`.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Topic page | Server `content.tsx` + client demo leaves | Client page | src/handbook/seo/content.tsx |
| Metadata | Helpers in the catalog (`topicMetadata`, `practiceMetadata`) and `sectionMetadata` | Hand-written metadata per route | src/practices/catalog.ts |
| Fetching own pages | `fetch` same-origin + `DOMParser` | A server route that fetches the site itself | src/handbook/seo/inspect.ts |
| Exercise | `Choice` per item, check, summary | Drag and drop | src/handbook/seo/claims-demo.tsx |
| Select | `FieldSelect` | Raw `<select>` | src/handbook/seo/field-select.tsx |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `inspectPage` | src/handbook/seo/inspect.ts | sitemap audit, robots check, canonical check |
| `Topic`, `Toc`, `Toggle`, `Verdict`, `Choice`, `FieldSelect` | src/handbook/ | import |
| `CodeBlock` | src/handbook/e2e/code-block.tsx | show live robots.txt and generated tags |
| `NAV_FOLDERS`, catalog lists | src/components/playground/nav-folders.ts, src/practices/catalog.ts | sitemap entries |

## Data Model

| Entity | Purpose |
|--------|---------|
| `SITE_URL` (new) | `https://learn.huyle.work`, client-safe, in src/lib/site.ts |
| Sitemap entries (new) | built from `sections`, `practices`, `topicPages`; `lastModified` from `updated` (section: latest page; home: latest overall) |
| robots.txt parser + matcher (new, client) | groups, rules, matching per Google |
| Robots rule builder (new, client) | rule set → meta, header, Next.js object, effects, warnings |
| Status situations (new, client) | situation, accepted codes, reason, Google, Next.js |

### Metadata members touched

- `metadata` -- src/app/layout.tsx:15 (gains `metadataBase`; no canonical here, on purpose)
- `topicMetadata` -- src/practices/catalog.ts (gains `alternates.canonical`)
- `practiceMetadata` -- src/practices/catalog.ts (gains `alternates.canonical`)
- `sectionMetadata` -- src/components/playground/section-index.tsx (gains `alternates.canonical`)
- React Practices index -- src/app/(playground)/react-practices/page.tsx (canonical)
- Home -- src/app/(playground)/page.tsx (new `metadata` with canonical `/`)
- Placeholders -- src/app/(playground)/seo/[slug]/page.tsx and react-practices/[slug]/page.tsx (`robots: { index: false, follow: true }`, no sitemap entry)

### API Contracts

| Endpoint | Method | Response |
|----------|--------|----------|
| /robots.txt | GET | `User-Agent: *`, `Allow: /`, `Sitemap: https://learn.huyle.work/sitemap.xml` |
| /sitemap.xml | GET | `<urlset>` with `<loc>` and `<lastmod>` per indexable page |
| /api/* | any | existing bodies, plus `X-Robots-Tag: noindex` (next.config `headers()`) |

## Decisions

| Decision | Rationale |
|----------|-----------|
| No `Disallow: /api/`; `X-Robots-Tag: noindex` on `/api/*` instead | Demos fetch the API while the page renders; Google advises against blocking resources pages need; the header keeps JSON out of the index |
| Canonical per page through the metadata helpers, never in the root layout | A layout canonical is inherited by every page that doesn't override it, which points the whole site at one URL; this is the page's main trap example |
| `SITE_URL` constant, not an env var | One production host; client demos need it too; a constant can't be missing at runtime |
| Placeholder pages: `noindex, follow`, not in the sitemap | Thin "being written" pages shouldn't be indexed, but their links still help discovery |
| robots.txt tester implements Google's rules (group by most specific agent, combine same-agent groups, longest match, Allow wins ties, `*`/`$`, percent-decoding not modelled) | Explainable in the result; the assumptions note names what is simplified |
| Sitemap audit runs fetches 4 at a time with progress | ~50 URLs finish in a few seconds without flooding the server |
| Canonical check uses `fetch` and reads `Response.redirected`/`url` | Trailing-slash requests are redirected by Next.js (308), which the browser follows; the demo reports the final URL |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| site URL | src/lib/site.ts | new | `SITE_URL` |
| robots | src/app/robots.ts | new | AC-001 |
| sitemap | src/app/sitemap.ts | new | AC-002 |
| layout, catalog helpers, section index, home, practices index | (listed above) | modify | AC-003 |
| placeholder routes | seo/[slug], react-practices/[slug] | modify | AC-004 |
| next.config | next.config.ts | modify | AC-005 |
| catalog | src/practices/catalog.ts | modify | mark `crawling-indexing` written |
| Page route + content | src/app/(playground)/seo/crawling-indexing/page.tsx, src/handbook/seo/crawling/content.tsx | new | AC-006, 008, 010, 012, 014, 016 |
| robots.txt model + tester | src/handbook/seo/crawling/robots-txt.ts, robots-demo.tsx | new | AC-007 |
| Sitemap view + audit | src/handbook/seo/crawling/sitemap-demo.tsx | new | AC-008, AC-009 |
| Robots rules builder + site check | src/handbook/seo/crawling/robots-rules.ts, rules-demo.tsx | new | AC-010, AC-011 |
| Canonical check | src/handbook/seo/crawling/canonical-check.tsx | new | AC-013 |
| Status exercise | src/handbook/seo/crawling/status.ts, status-demo.tsx | new | AC-015 |
| How search works | src/handbook/seo/content.tsx | modify | text no longer says the canonical is missing |

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | robots | src/app/robots.ts | Done |
| AC-002 | sitemap | src/app/sitemap.ts | Done |
| AC-003 | metadata helpers | catalog.ts, section-index.tsx, layout.tsx, page.tsx files | Done |
| AC-004 | placeholder routes | seo/[slug]/page.tsx, react-practices/[slug]/page.tsx | Done |
| AC-005 | next.config headers, robots | next.config.ts, robots.ts | Done |
| AC-006, AC-007 | RobotsDemo | crawling/robots-txt.ts, robots-demo.tsx | Done |
| AC-008, AC-009 | SitemapDemo | crawling/sitemap-demo.tsx | Done |
| AC-010, AC-011 | RulesDemo | crawling/robots-rules.ts, rules-demo.tsx | Done |
| AC-012, AC-013 | CanonicalCheck | crawling/canonical-check.tsx | Done |
| AC-014, AC-015 | StatusDemo | crawling/status.ts, status-demo.tsx | Done |
| AC-016 | content | crawling/content.tsx | Done |

## Test Strategy

| Aspect | Detail |
|--------|--------|
| Framework | No unit runner; `curl` for the routes, Puppeteer for the page |
| Command | `pnpm typecheck && pnpm lint && pnpm build` |

Checks:

- `curl /robots.txt`, `/sitemap.xml` (count equals indexable pages), `-I /api/health` shows `x-robots-tag: noindex`.
- Every written page's HTML has a canonical equal to its URL (scripted over the sitemap); placeholders carry `noindex`.
- Tester: `Disallow: /seo/` + `Allow: /seo/how-search-works` → that page allowed, `/seo/ai-search` blocked; `Disallow: /*.json$` blocks `/a.json`, not `/a.json?x`; a Googlebot group beats `*`; no group → allowed.
- Sitemap audit reports zero problems.
- Canonical check: slash → redirected to the clean URL; `?utm_source` → 200 with clean canonical; mixed case → 404.
- axe light and dark, 360 px, keyboard.

## Considerations

- Security: demos fetch only same-origin paths from fixed lists or the site's own sitemap; the tester parses text locally.
- Cloudflare: `robots.ts` and `sitemap.ts` have no request-time APIs, so they're static at build.

## Open Questions

- None

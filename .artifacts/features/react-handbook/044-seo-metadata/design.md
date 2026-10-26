---
id: "044"
feature: seo-metadata
created: 2026-10-22
---

# Technical Design: SEO, Metadata and structured data

## Scope

In: Open Graph and X card metadata for every indexable page through one helper, a build-time card image route `/og/[kind]/[slug]`, JSON-LD components (`Article`, `BreadcrumbList`, `WebSite`), and the page `/seo/metadata-structured-data` with five topics and five demos.
Out: other rich result types for this site, `llms.txt` (page 5).

## Research Summary

> From .artifacts/research/seo-fundamentals.md, "Title links and snippets", "Structured data", "Next.js metadata, images, JSON-LD"

- Title links come from `<title>` first but can be rewritten; snippets mostly from content; both cut to fit the device.
- Article has no required properties; BreadcrumbList needs ordered `ListItem`s with position, name and item (last may omit item).
- Markup must match visible content; FAQ and HowTo aren't in the gallery any more.
- Metadata merges shallowly: a page's `openGraph` replaces the layout's. `ImageResponse`: flexbox CSS subset, 500 KB bundle. Escape `<` in JSON-LD.

## Patterns & Reuse

| Pattern | Project Uses | Reference |
|---------|-------------|-----------|
| Metadata helpers | `topicMetadata`, `practiceMetadata`, `sectionMetadata` | src/practices/catalog.ts, section-index.tsx |
| Build-time route handler | `generateStaticParams` + `dynamicParams = false` | src/app/seo-lab/[lab]/page.tsx (pages), bundled route.md |
| Live page reading | `inspectPage`, `readDocument` | src/handbook/seo/inspect.ts |
| Page list | `NAV_FOLDERS`, sitemap helpers | nav-folders.ts, crawling/sitemap.ts |

## Data Model

| Entity | Purpose |
|--------|---------|
| `pageMetadata()` (new, src/lib/social.ts) | title, description, canonical, full `openGraph` and `twitter` objects for one page |
| Cards (new, src/lib/cards.ts) | every card: kind (`site`, `section`, `practice`, `topic`), slug, eyebrow, title, level; `cardPath(kind, slug)` |
| `CardLayout` (new, src/lib/card-layout.tsx) | the card's JSX with inline styles, shared by the image route and the demo's live preview |
| JSON-LD (new, src/lib/json-ld.tsx) | `JsonLd` (escaped script), `articleLd`, `breadcrumbLd`, `websiteLd` |
| Structured data rules (new, client) | per type: required and recommended properties, retired-type notes, preview kind |

### API Contracts

| Endpoint | Method | Response |
|----------|--------|----------|
| /og/{site,section,practice,topic}/{slug} | GET | 1200 × 630 `image/png`, built at build time; unknown → 404 |

## Decisions

| Decision | Rationale |
|----------|-----------|
| One route `/og/[kind]/[slug]` instead of an `opengraph-image.tsx` per route folder | The site has ~50 routes in separate folders; one route keeps the design in one place and is still static |
| Every page builds its full `openGraph` through `pageMetadata()`, nothing in the root layout | Shallow merging would drop layout fields such as `siteName`; one helper can't forget them |
| `Article` (not `TechArticle`) for handbook pages | Google documents Article, NewsArticle and BlogPosting |
| Dates in JSON-LD as `YYYY-MM-DDT00:00:00+07:00` | Google asks for a time zone; pages are dated in the author's time zone |
| Social preview converts absolute image URLs on `learn.huyle.work` to local paths | In development the production image may not exist yet; the checklist still checks the absolute URL |
| Pixel widths in the SERP preview measured with canvas `measureText` in Arial (20 px title, 14 px snippet), desktop title box 600 px | Matches the commonly observed result layout; labelled as an approximation |

## Component Design

| Component | File | Action |
|-----------|------|--------|
| site, social helpers | src/lib/site.ts, src/lib/social.ts | modify / new |
| cards, card layout, og route | src/lib/cards.ts, src/lib/card-layout.tsx, src/app/og/[kind]/[slug]/route.tsx | new |
| metadata helpers | catalog.ts, section-index.tsx, react-practices/page.tsx, (playground)/page.tsx | modify |
| JSON-LD | src/lib/json-ld.tsx; TopicFrame, PracticeFrame, SectionIndex, home | new / modify |
| Demos | src/handbook/seo/metadata/{serp-demo, social-demo, card-demo, jsonld-demo, editor-demo}.tsx, rules.ts | new |
| Content + route | src/handbook/seo/metadata/content.tsx, src/app/(playground)/seo/metadata-structured-data/page.tsx | new |
| Catalog | src/practices/catalog.ts | mark written |

## Requirements Traceability

| Requirement | File | Status |
|-------------|------|--------|
| AC-001 | social.ts, catalog.ts, section-index.tsx, page.tsx files | Done |
| AC-002 | cards.ts, card-layout.tsx, og route | Done |
| AC-003 | json-ld.tsx, topic-frame.tsx, practice-frame.tsx, section-index.tsx, home | Done |
| AC-004, AC-005 | content.tsx, serp-demo.tsx | Done |
| AC-006, AC-007 | content.tsx, social-demo.tsx | Done |
| AC-008, AC-009 | content.tsx, card-demo.tsx | Done |
| AC-010, AC-011 | content.tsx, jsonld-demo.tsx, rules.ts | Done |
| AC-012, AC-013 | content.tsx, editor-demo.tsx, rules.ts | Done |
| AC-014 | content.tsx | Done |

## Test Strategy

- Script over the sitemap: every URL has the AC-001 tags; handbook URLs have both JSON-LD blocks that pass the rules; `og:url` equals the canonical.
- `curl` card images: `image/png`, 1200 × 630; unknown card 404.
- Browser: each demo's states, including a failed image and invalid JSON; axe light and dark, 360 px; quality gates.

## Considerations

- Security: JSON-LD is serialized from catalog data with `<` escaped; the editor parses text locally and never injects it.
- Card images are built at build time; nothing renders on request.

## Open Questions

- None

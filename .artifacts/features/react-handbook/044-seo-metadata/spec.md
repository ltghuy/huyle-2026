---
id: "044"
feature: seo-metadata
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-22
---

# Feature: SEO section, Metadata and structured data

## Overview

Once a page is indexed, what people see decides whether they click: the title
link and snippet in search results, the card when someone shares the link, and
rich results built from structured data. Frontend engineers own all three, and
the usual failures are quiet ones: a title template that leaves "Home ·
Site", a social card with no image or the site name lost, a share preview that
shows the wrong page, JSON-LD that doesn't match the page or uses a type Google
retired.

This page explains how search engines build title links and snippets, how
social cards are read, how to generate card images in Next.js, and how
structured data works and what Google still shows for it. It adds the real
setup to this site: Open Graph and X card tags on every page, a generated card
image per page, and JSON-LD (`Article` and `BreadcrumbList` on handbook pages,
`WebSite` on the home page). The demos read the live tags, images and JSON-LD.

## Goals

- [x] Every indexable page sends Open Graph and X card tags with its own title, description, URL and a 1200 × 630 generated image, and handbook pages send `Article` and `BreadcrumbList` JSON-LD that matches the visible page.
- [x] Each of the five topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input; four of them read this site's live tags, images or JSON-LD.
- [x] The How search works crawler view shows the social card and structured data as present, with no change to its code.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Product, Event, Recipe and other rich result types for this site | The site has none of that content; the editor demo covers them with samples |
| Rewriting this site's titles and descriptions | They pass the 043 check; the SERP preview lets the reader judge lengths |
| `llms.txt` and AI crawlers | Page 5 |
| Image and video sitemaps, hreflang | Page 6 |
| Submitting pages to the Rich Results Test | It's Google's tool; the page links to it |

## User Stories

### P1: The site's own setup

- As a learner, I want this site to send the tags, images and JSON-LD the page explains, so that the examples are real.
- **Why P1:** The demos read them.
- **Independent Test:** View the source of a topic page: `og:*`, `twitter:*` and two JSON-LD blocks; open its card image.

**Acceptance Criteria:**

- [x] AC-001: WHEN any indexable page is served THEN its HTML SHALL contain `og:title`, `og:description`, `og:url` (its canonical URL), `og:site_name`, `og:type` (`article` for handbook pages, `website` otherwise), `og:image` with width, height and alt, and `twitter:card` set to `summary_large_image`.
- [x] AC-002: WHEN a page's card image is requested THEN the site SHALL return a 1200 × 630 PNG showing the site name, the page's section and title, built at build time.
- [x] AC-003: WHEN a handbook page (practice or topic) is served THEN its HTML SHALL contain `Article` JSON-LD (headline, description, datePublished, dateModified, image, author) and `BreadcrumbList` JSON-LD matching the visible breadcrumbs, with `<` escaped; the home page SHALL contain `WebSite` JSON-LD.

### P1: Title links and snippets

- As a learner, I want to see how a title and description look in a result and where they get cut, so that I write them for the result.
- **Why P1:** They're the first thing a searcher reads.
- **Independent Test:** Pick a page, lengthen its title, and see it cut off in the desktop preview.

**Acceptance Criteria:**

- [x] AC-004: WHEN the topic is shown THEN it SHALL explain where Google takes a title link from and why it rewrites one, that snippets come mostly from page content and sometimes the meta description, that neither has a length limit but both are cut to fit, and the snippet controls (`nosnippet`, `max-snippet`, `data-nosnippet`).
- [x] AC-005: WHEN the learner picks a page of this site (or edits its title and description) THEN the demo SHALL show a desktop and a mobile result preview, measure the title's width in pixels, and say whether and where each is likely cut off, labelled as an approximation.

### P1: Social cards

- As a learner, I want to see how a shared link looks on common platforms and what each tag does, so that my links preview well.
- **Why P1:** Link previews read only the server HTML and fail silently.
- **Independent Test:** Pick a page; see an X, Slack and Facebook-style preview built from its live tags, and a checklist.

**Acceptance Criteria:**

- [x] AC-006: WHEN the topic is shown THEN it SHALL explain the Open Graph tags and X card tags, that preview bots read only the server HTML, image size and absolute URLs, and that Next.js merges metadata shallowly so a page's `openGraph` replaces the layout's.
- [x] AC-007: WHEN the learner picks a page of this site THEN the demo SHALL read its live `og:*` and `twitter:*` tags, show previews in the shape of an X card, a Slack unfurl and a Facebook post, and check that each required tag is present, the image URL is absolute and loads at 1200 × 630, and `og:url` matches the canonical URL.

### P1: Generated card images

- As a learner, I want to see how this site generates its card images, so that I can do the same.
- **Why P1:** A missing or generic image is the most common card problem.
- **Independent Test:** Pick a page; see its real card image and response headers; type a long title into the layout preview and see where it wraps.

**Acceptance Criteria:**

- [x] AC-008: WHEN the topic is shown THEN it SHALL explain `ImageResponse` and the `opengraph-image` file convention, the CSS subset it supports, the 500 KB bundle limit, generating images at build time, and why this site uses one route for all pages.
- [x] AC-009: WHEN the learner picks a page THEN the demo SHALL show its real generated image with its URL, type, size and dimensions, and a live preview of the same layout where the learner can edit the title to see how long titles wrap.

### P1: Structured data on this site

- As a learner, I want to read and check the JSON-LD a page sends, so that I know it's valid and honest.
- **Why P1:** Structured data that doesn't match the page can cost rich results.
- **Independent Test:** Pick a topic page; see its `Article` and `BreadcrumbList` blocks, each property checked, and the headline compared with the visible `h1`.

**Acceptance Criteria:**

- [x] AC-010: WHEN the topic is shown THEN it SHALL explain schema.org, JSON-LD as Google's recommended format, that markup must describe visible content, that it makes a page eligible for rich results without guaranteeing them or raising its rank, and how this site renders it safely in Next.js.
- [x] AC-011: WHEN the learner picks a page THEN the demo SHALL list each JSON-LD block the page sends, check it against Google's documented properties for its type (recommended properties for `Article`; required `itemListElement`, `position`, `name` and `item` for `BreadcrumbList`), and compare the values with the visible page (headline with the `h1`, dates with the page's dates, breadcrumb names with the visible breadcrumbs).

### P1: Rich results

- As a learner, I want to write JSON-LD and see whether it's valid and what result it could earn, so that I use types Google still supports.
- **Why P1:** Teams still add FAQ and HowTo markup that no longer shows.
- **Independent Test:** Load the FAQ sample; it's valid JSON-LD but flagged as no longer shown for most sites.

**Acceptance Criteria:**

- [x] AC-012: WHEN the topic is shown THEN it SHALL explain which rich results exist (Article, Breadcrumb, Product, Review snippet, Event, Recipe and others in Google's gallery), that FAQ and HowTo rich results were cut back in 2023 and are no longer in the gallery, and the manual action for spammy markup.
- [x] AC-013: WHEN the learner edits JSON-LD (or loads a sample: Article, BreadcrumbList, Product, FAQPage, HowTo) THEN the demo SHALL report JSON errors with their position, the type, missing required and recommended properties, a note for types Google no longer shows, and a preview of the result it could earn.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-014: WHEN a topic is shown THEN it SHALL end with a short "read more" holding the senior-level points (Google rewrites title links it finds misleading, `og:url` and canonical should agree, preview caches need a re-scrape after a fix, structured data is a contract with the visible page, testing markup in CI) and links to the primary sources it draws from.

## Edge Cases

- WHEN a card image fails to load in the social preview THEN the demo SHALL show the failure in the checklist and a placeholder in the preview.
- WHEN a page sends no JSON-LD THEN the structured data demo SHALL say so instead of showing an empty list.
- WHEN the editor's text isn't valid JSON THEN it SHALL show the parser's message and position and keep the last valid preview hidden.
- WHEN the learner clears the title in the SERP preview THEN it SHALL say Google would generate one from the page.
- WHEN a fetch fails THEN the demo SHALL say so and offer to retry.

## Success Criteria

- [x] Every sitemap URL sends the AC-001 tags, and every handbook page's JSON-LD passes the AC-011 checks (verified by script over the sitemap).
- [x] Every card image is a 1200 × 630 PNG.
- [x] The page passes axe in light and dark themes (apart from the site-wide sidebar finding noted in 041), works at 360 px width without horizontal scroll, and every demo can be used with the keyboard.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

Sources: Google's title link, snippet, Article and Breadcrumb structured data,
structured data policies and search gallery pages; the Open Graph protocol;
X's card markup docs; the bundled Next.js 16 docs on `openGraph`, metadata
merging, `ImageResponse` and JSON-LD.

## Baseline

### Current Behavior

- Pages send a title, description and canonical URL, and no Open Graph, X card or JSON-LD.

### Gaps / Limitations

- Shared links preview as bare URLs, and search engines get no structured description of the handbook pages.

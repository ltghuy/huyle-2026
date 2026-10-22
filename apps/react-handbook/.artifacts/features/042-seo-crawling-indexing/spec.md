---
id: "042"
feature: seo-crawling-indexing
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-22
---

# Feature: SEO section, Crawling and indexing control

## Overview

How search works (041) showed where a page can drop out of search. This page
covers the controls a frontend engineer has over the first stages:
robots.txt, the sitemap, robots rules in a meta tag or a header, canonical
URLs, and status codes and redirects. The same mistakes come up on most sites:
robots.txt used to hide a page, a sitemap full of redirects, a canonical set
once in the root layout so every page points to the home page, a 200 for a page
that's gone.

This site has none of these controls yet. This feature adds them for real on
`learn.huyle.work` and writes the page that explains them, so each topic shows
the site's live robots.txt, sitemap, headers and HTML. It follows the other
topic pages: short topics, each with a demo whose result changes with the
learner's input, and simplified models labelled as such.

## Goals

- [x] This site serves a robots.txt, a sitemap of every indexable page, a self-referencing canonical URL on every page, `noindex` on placeholder pages, and an `X-Robots-Tag: noindex` header on its API responses.
- [x] Each of the five topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input, and four of them read this site's live responses.
- [x] The How search works crawler view shows the canonical URL as present on every written page, with no change to its code.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rules for AI crawlers in robots.txt | Page 5 (SEO for AI search and LLMs) adds them |
| Social cards, images and JSON-LD | Page 4 |
| Per-route metadata checks in the server HTML and rendering strategies | Page 3 |
| Sitemap index files, image and video sitemaps, hreflang in sitemaps | The site is small enough for one sitemap; covered in "read more" and page 6 |
| Submitting the sitemap in Search Console | Needs the owner's account; the page explains how |
| Automated SEO checks in CI | Page 6 |

## User Stories

### P1: The site's own setup

- As a learner, I want this site to serve the files and tags the page explains, so that the examples are real and I can inspect them.
- **Why P1:** The page quotes these responses.
- **Independent Test:** `curl` `/robots.txt`, `/sitemap.xml` and an API route; view the source of a written page and of a placeholder page.

**Acceptance Criteria:**

- [x] AC-001: WHEN `/robots.txt` is requested THEN the site SHALL return rules that allow every crawler to fetch every path, and a `Sitemap:` line with the sitemap's absolute URL.
- [x] AC-002: WHEN `/sitemap.xml` is requested THEN the site SHALL return the absolute URL of the home page, every section page and every written or built page, each with a `lastmod` taken from the page's last content change, and SHALL leave out placeholder pages.
- [x] AC-003: WHEN any page is served THEN its HTML SHALL contain a `rel="canonical"` link with its own absolute URL (no query string, no trailing slash).
- [x] AC-004: WHEN a placeholder page (a page being written) is served THEN its HTML SHALL contain a robots meta tag with `noindex` that still lets crawlers follow its links.
- [x] AC-005: WHEN any `/api/` route responds THEN the response SHALL carry `X-Robots-Tag: noindex`, and robots.txt SHALL NOT block `/api/`, so pages that fetch from the API can still be rendered by crawlers.

### P1: robots.txt

- As a learner, I want to test robots.txt rules against URLs and crawlers, so that I can predict which rule wins.
- **Why P1:** robots.txt is the first file a crawler reads and the most misused.
- **Independent Test:** Add `Disallow: /seo/` and `Allow: /seo/how-search-works`, test both URLs for Googlebot, and see which rule wins and why.

**Acceptance Criteria:**

- [x] AC-006: WHEN the topic is shown THEN it SHALL show this site's live robots.txt, and explain the format (user-agent groups, `Allow`, `Disallow`, `*` and `$`, `Sitemap`), that it controls crawling and not indexing, and what crawlers do when the file is missing or failing.
- [x] AC-007: WHEN the learner edits a robots.txt, picks a crawler and enters a URL path THEN the demo SHALL say whether the crawler may fetch it, which group applied, which rule matched and why (most specific user-agent group, longest matching path, the less restrictive rule on a tie), following Google's documented rules.

### P1: Sitemaps

- As a learner, I want to read and audit this site's sitemap, so that I know what belongs in one.
- **Why P1:** A sitemap that lists redirects, errors or `noindex` pages sends mixed signals.
- **Independent Test:** Run the audit; every listed URL returns 200, isn't `noindex`, and names itself as canonical.

**Acceptance Criteria:**

- [x] AC-008: WHEN the topic is shown THEN it SHALL show this site's live sitemap (number of URLs, each URL with its `lastmod`) and explain what to list (canonical, indexable URLs), the limits (50,000 URLs or 50 MB per file), sitemap index files, `lastmod` accuracy, and that Google ignores `priority` and `changefreq`.
- [x] AC-009: WHEN the learner runs the audit THEN the demo SHALL fetch every URL in the live sitemap and report, per URL, its status, whether it redirected, whether it's `noindex`, and whether its canonical URL matches the listed URL, with a summary of problems found.

### P1: Robots rules in a meta tag or header

- As a learner, I want to build a set of robots rules and see them as a meta tag, a header and Next.js metadata, so that I can apply them anywhere.
- **Why P1:** `noindex` is the correct way to keep a page out of search, and the syntax differs by place.
- **Independent Test:** Pick `noindex` and `max-snippet:50`; the demo shows the three forms and what a search engine does.

**Acceptance Criteria:**

- [x] AC-010: WHEN the learner picks rules (for example `noindex`, `nofollow`, `nosnippet`, `max-snippet`, `max-image-preview`, `noimageindex`, `unavailable_after`, `indexifembedded`) THEN the demo SHALL show the matching `<meta name="robots">` tag, `X-Robots-Tag` header and Next.js `robots` metadata, and say what a search engine does with the page; it SHALL warn about rules that have no effect (`noarchive`, `indexifembedded` without `noindex`) and about combinations where the more restrictive rule wins.
- [x] AC-011: WHEN the learner checks this site THEN the demo SHALL fetch a written page, a placeholder page, an API route and a missing page, and show the robots rules each sends and where they come from.

### P1: Canonical URLs on this site

- As a learner, I want to see how this site declares its canonical URLs and how it answers for URL variants, so that I can set them up in a Next.js app.
- **Why P1:** A canonical in the wrong place points every page at one URL.
- **Independent Test:** Fetch the page with a trailing slash, a tracking parameter and different letter case, and see the status and canonical of each.

**Acceptance Criteria:**

- [x] AC-012: WHEN the topic is shown THEN it SHALL explain self-referencing canonical URLs, absolute URLs through `metadataBase`, why a canonical set in a shared layout is inherited by every page below it, and that canonical URLs, redirects, internal links and the sitemap should agree.
- [x] AC-013: WHEN the learner runs the check THEN the demo SHALL request this page's URL as is, with a trailing slash, with a tracking parameter and in different letter case, and show for each the status, any redirect and the canonical URL in the HTML, with what a search engine would make of it.

### P1: Status codes and redirects

- As a learner, I want to choose the right status code for common situations and see how Next.js sends it, so that crawlers get the truth about each URL.
- **Why P1:** A wrong status creates soft 404s and slow migrations.
- **Independent Test:** Pick "the product is gone for good" and see 404 or 410, how Next.js sends it, and what Google does.

**Acceptance Criteria:**

- [x] AC-014: WHEN the topic is shown THEN it SHALL explain how crawlers treat 200, 301 and 308, 302 and 307, 404 and 410, 429, 500 and 503, soft 404s, and redirect chains (Google follows up to 10 hops), and name the Next.js way to send each (`redirect`, `permanentRedirect`, redirects in `next.config`, `notFound`, a route handler or proxy for other codes).
- [x] AC-015: WHEN the learner picks the status code for each of a list of situations (for example a page moved for good, a temporary sale page, a deleted product, a search with no results, maintenance, an old URL scheme across the whole site) THEN the demo SHALL show the recommended code, the reason, what Google does and how to send it in Next.js, and a summary when every situation is answered.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-016: WHEN a topic is shown THEN it SHALL end with a short "read more" holding the senior-level points (robots.txt is cached for up to a day and a failing one pauses crawling, crawl budget only matters for very large sites, `lastmod` is used only when it's trustworthy, a canonical can be overruled, redirect chains waste crawls) and links to the primary sources it draws from.

## Edge Cases

- WHEN the learner's robots.txt has no group for the chosen crawler and no `*` group THEN the tester SHALL say every path is allowed.
- WHEN a robots.txt line can't be parsed THEN the tester SHALL ignore it, as crawlers do, and list it as ignored.
- WHEN the learner enters a path that doesn't start with `/` THEN the tester SHALL add the leading slash and say so.
- WHEN a fetch in any live demo fails THEN the demo SHALL say so and offer to retry, never break the page.
- WHEN the sitemap audit is running THEN it SHALL show progress and let the learner run it again once it's done.

## Success Criteria

- [x] The sitemap audit reports no problems on this site.
- [x] Every written page's server HTML has a canonical URL equal to its own address, checked by the How search works crawler view and by `curl`.
- [x] The page passes axe in light and dark themes (apart from the site-wide sidebar finding noted in 041), works at 360 px width without horizontal scroll, and every demo can be used with the keyboard.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

The robots.txt tester runs Google's documented matching rules in the browser;
other engines can differ in details, and the page says so. Blocking `/api/` in
robots.txt was considered and rejected: some pages fetch from the API while
they render, and Google recommends not blocking resources a page needs, so the
API is kept out of the index with a header instead.

## Baseline

### Current Behavior

- The site serves no robots.txt (404) and no sitemap.
- Pages send a title and description, with no canonical URL and no robots rules; placeholder pages look like ordinary pages to a crawler.
- API responses carry no indexing headers.

### Gaps / Limitations

- Search engines have to guess which pages matter and which URL of each is the right one, and placeholder pages can be indexed.

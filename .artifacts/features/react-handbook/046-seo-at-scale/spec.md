---
id: "046"
feature: seo-at-scale
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-22
---

# Feature: SEO section, SEO at scale

## Overview

The earlier SEO pages cover one site with a few dozen pages. Senior engineers
work on sites where a single template produces thousands of URLs, where the
site exists in several languages, where a redesign moves every URL, and where
nobody notices a lost canonical tag until traffic drops a month later. The
failures at that size are quiet and expensive: hreflang that Google ignores
because return links are missing, a migration that chains redirects or drops
URLs, filters that generate millions of crawlable pages, templated pages that
fall under the spam policies, and SEO regressions that ship because no test
checks them.

This page covers international sites and hreflang, site migrations, faceted
navigation and pagination, content at scale and the spam policies, and
monitoring crawling and testing SEO automatically. It adds the real setup to
this site: an SEO spec in the end-to-end suite that checks every sitemap URL,
the robots and llms.txt files, this site's own redirects and its noindex
rules, and the page shows that spec and its recorded results.

## Goals

- [x] The end-to-end suite checks this site's SEO on every run (status, title, description, canonical, robots rules, social tags and JSON-LD on every sitemap URL, plus robots.txt, llms.txt, redirects and noindex headers), and its recorded results show on the page.
- [x] Each of the five topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input; one reads this site's live redirects and one shows the recorded test run.
- [x] Every claim traces to a primary source in the research cache, and claims the research marks unconfirmed are left out or labelled.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Translating this site or adding hreflang to it | The site is English only; the demo uses sample clusters |
| Running the SEO checks in a CI service | The repo has no CI pipeline; the suite runs locally with the existing command |
| Calling Search Console or Bing APIs | Needs an owner's account; the page explains the URL Inspection API and its limits |
| Lighthouse in the test suite | A second tool for overlapping checks; the page lists its SEO audits |
| IndexNow pings from this site | Google doesn't support it and the site changes rarely; the page explains it |
| Image and video sitemaps for this site | The site has no image or video content worth a sitemap; the page covers the rules briefly |

## User Stories

### P1: The site's own SEO tests

- As a learner, I want this site's own SEO checked by its end-to-end suite, so that the testing advice on the page is real.
- **Why P1:** The page quotes the spec and shows its results.
- **Independent Test:** Run the suite; the SEO tests pass, and break one page's canonical to see a test fail.

**Acceptance Criteria:**

- [x] AC-001: WHEN the end-to-end suite runs THEN it SHALL check every sitemap URL returns 200 with one H1, a title, a meta description, a canonical URL equal to the sitemap URL, `og:url` equal to the canonical, no noindex, and valid JSON-LD on handbook pages (an Article whose headline matches the H1, and a BreadcrumbList).
- [x] AC-002: WHEN the end-to-end suite runs THEN it SHALL check that robots.txt names the sitemap, allows all crawlers and blocks the AI training crawlers; that every llms.txt link is a sitemap URL; that the old practice URLs answer with a permanent redirect straight to their new URL; that lab pages and API responses send noindex; and that an unknown URL returns 404.
- [x] AC-003: WHEN a suite run is recorded THEN the SEO tests SHALL appear in the recorded results like the other specs.

### P1: International sites

- As a learner, I want to check an hreflang cluster, so that Google doesn't ignore it.
- **Why P1:** Broken hreflang fails silently.
- **Independent Test:** Load the sample with a missing return link; the checker names the page and the missing link.

**Acceptance Criteria:**

- [x] AC-004: WHEN the topic is shown THEN it SHALL explain the three ways to send hreflang, that each version lists itself and every other version and links must be reciprocal, `x-default`, valid language and region codes (with `en-UK` as the common mistake), absolute URLs, that Google detects language from content, why automatic locale redirects hurt crawling, the URL structure options, and the framework pitfalls (a page's alternates replacing the layout's, sitemap examples without a self-reference).
- [x] AC-005: WHEN the learner edits a cluster (pages with their language and the alternates each one lists) or loads a sample THEN the demo SHALL report per page a missing self-reference, missing or one-way return links, invalid codes, relative URLs and a missing `x-default`, and show the cluster as a grid of which page links to which.

### P1: Site migrations

- As a learner, I want to check a redirect map before a move, so that no URL is lost or chained.
- **Why P1:** Migrations are where large sites lose traffic.
- **Independent Test:** Load the sample map; see a chain, a loop, a temporary redirect and an old URL with no target flagged; check this site's own redirects live.

**Acceptance Criteria:**

- [x] AC-006: WHEN the topic is shown THEN it SHALL explain mapping every old URL, server-side permanent redirects (301 or 308) straight to the final URL, 404 or 410 for URLs with no equivalent, keeping redirects at least a year, updating canonicals, hreflang, internal links and sitemaps, the Change of Address tool and its limits, expected ranking fluctuation, and this site's own move of the practice pages.
- [x] AC-007: WHEN the learner edits a redirect map or loads a sample THEN the demo SHALL resolve each old URL to its final target and flag chains (with the hop count), loops, temporary redirects, targets that are themselves redirected or missing, and old URLs with no mapping; and SHALL check this site's two practice redirects live, showing where each ends up.

### P1: Faceted navigation and pagination

- As a learner, I want to see how filters multiply URLs and what each crawl strategy does, so that crawlers spend time on pages that matter.
- **Why P1:** Facets are the main source of crawl waste on large sites.
- **Independent Test:** Turn on three filters; see the URL count grow, the normalized URL, and an empty combination return 404 under the indexable strategy.

**Acceptance Criteria:**

- [x] AC-008: WHEN the topic is shown THEN it SHALL explain overcrawling, keeping filtered URLs out of crawling (robots.txt rules, URL fragments) or making them indexable (standard `&` separators, a consistent filter order, 404 for empty or nonsense combinations), the weaker `nofollow` and canonical options, pagination (linked pages with their own URLs, self-canonical, `rel=next/prev` no longer used by Google), infinite scroll, and image and video sitemaps for large catalogues.
- [x] AC-009: WHEN the learner picks filters, values and a strategy THEN the demo SHALL show the URL the site would link to, its normalized form, how many filter URLs the catalogue can produce, whether a crawler may fetch it and what status and canonical it gets, with the sample catalogue labelled as sample data.

### P1: Content at scale

- As a learner, I want to sort real-looking cases of generated pages into allowed and spam, so that I can review a programmatic SEO plan.
- **Why P1:** Template pages are the main spam risk for engineering teams.
- **Independent Test:** Sort "one page per city with only the city name changed"; it's doorway abuse, with Google's wording.

**Acceptance Criteria:**

- [x] AC-010: WHEN the topic is shown THEN it SHALL explain scaled content abuse (however the content is made), doorway abuse, site reputation abuse, Google's position on AI-generated content, people-first content and the "who, how, why" questions, and that the helpful content system is now part of core ranking.
- [x] AC-011: WHEN the learner sorts each case into a category THEN the demo SHALL say whether the choice matches, give Google's reasoning with the policy it falls under, and keep a score; it SHALL work with the keyboard.

### P1: Monitoring and automated checks

- As a learner, I want to see what to monitor and how this site tests its SEO, so that I can add the same checks.
- **Why P1:** It's the setup a senior engineer is expected to own.
- **Independent Test:** Open the demo; see each SEO test with its recorded outcome, and the spec's code.

**Acceptance Criteria:**

- [x] AC-012: WHEN the topic is shown THEN it SHALL explain verifying Googlebot (reverse and forward DNS, published IP ranges), the Crawl Stats report, who needs to think about crawl budget, slowing crawling with 503 or 429 for no more than a day or two, what to assert in end-to-end tests, the URL Inspection API and its limits, Lighthouse's SEO audits, and IndexNow and which engines use it.
- [x] AC-013: WHEN the demo is shown THEN it SHALL list each SEO test with its recorded outcome and duration from the last run, show the spec's code, and say when the run was recorded; when no run has been recorded it SHALL say so.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-014: WHEN a topic is shown THEN it SHALL end with a short "read more" holding the senior-level points (hreflang errors are silent, migrations need monitoring of old and new URLs, a 404 beats an empty 200 for filters, pages made mainly to rank are spam at any scale, tests catch regressions that reports show weeks later) and links to the primary sources it draws from.

## Edge Cases

- WHEN the hreflang cluster has one page THEN the checker SHALL say a cluster needs at least two versions.
- WHEN a redirect map line can't be parsed THEN the demo SHALL show the line number and skip it.
- WHEN a redirect map has a loop THEN the demo SHALL stop following it and flag the loop.
- WHEN a filter combination matches no products THEN the facet demo SHALL show the 404 the indexable strategy calls for.
- WHEN the live redirect check fails THEN the demo SHALL say so and offer to retry.
- WHEN the recorded run has no SEO tests (recorded before they existed) THEN the monitoring demo SHALL say so and still show the code.

## Success Criteria

- [x] The full end-to-end suite passes with the SEO spec included, and the recorded run on the page includes it.
- [x] Breaking one page's canonical makes an SEO test fail with a message naming the URL (checked once, then reverted).
- [x] The page passes axe in light and dark themes (apart from the site-wide sidebar finding noted in 041), works at 360 px width without horizontal scroll, and every demo can be used with the keyboard.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

Sources: Google's pages on localized versions, multi-regional sites,
locale-adaptive pages, site moves, redirects, faceted navigation, pagination,
spam policies, helpful content, AI-generated content, crawl budget, crawl rate,
verifying Googlebot and the Crawl Stats report; Bing's webmaster guidelines and
crawl control; Lighthouse's SEO audits; IndexNow; the bundled Next.js 16 docs.
Checked 2026-10-22.

With this page all six SEO pages are written, so the section no longer shows
pages as being written.

## Baseline

### Current Behavior

- The end-to-end suite tests practice demos and two Gherkin features. Nothing checks status codes, canonical URLs, robots rules, redirects or the sitemap.
- The SEO at scale page shows a "being written" placeholder that isn't indexed.

### Gaps / Limitations

- An SEO regression (a lost canonical, a noindex left on, a broken redirect) would ship unnoticed until search reports showed it.

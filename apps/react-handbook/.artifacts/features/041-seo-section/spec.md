---
id: "041"
feature: seo-section
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-22
---

# Feature: SEO section, How search works

## Overview

The handbook covers how to build, ship, secure and test a frontend, but not how
people find it. SEO questions come up for frontend engineers more than they
expect: why a page isn't indexed, whether a client-rendered app can rank, what
belongs in `robots.txt` and the sitemap, how to move a site without losing
traffic, and now how AI assistants find and cite pages. Most learners know a
few rules ("add a meta description") without a model of how a search engine
gets from a URL to a result.

This feature opens a new SEO section with six pages and writes the first one,
How search works. The pages go from the basics to senior and expert level:

| # | Page | Level | What it sets up on this site |
|---|------|-------|------------------------------|
| 1 | How search works | Basics | Nothing yet; its demos read this site's real pages and list what's missing |
| 2 | Crawling and indexing control | Basics to intermediate | `robots.txt`, the sitemap, canonical URLs, meta robots |
| 3 | JavaScript and rendering SEO | Intermediate | Metadata on every route, checked in the server HTML |
| 4 | Metadata and structured data | Intermediate | Titles and descriptions, social cards and images, JSON-LD |
| 5 | SEO for AI search and LLMs | Intermediate to senior | `llms.txt`, rules for AI crawlers |
| 6 | SEO at scale | Senior to expert | Automated SEO checks in the end-to-end suite |

Later features write pages 2 to 6, one feature each, and each of those adds the
real setup its page explains, so the section's pages quote code that runs on
this site (`learn.huyle.work`). How search works gives the shared vocabulary
the other pages use: the crawl, render, index and serve pipeline, how pages are
discovered, what a crawler sees, duplicates and canonical URLs, and how ranking
and measurement work. It follows the other topic pages: short topics, each with
a demo whose result changes with the learner's input, and simplified models
labelled as such.

## Goals

- [x] The SEO section and the How search works page can each be reached in one click from the sidebar and the home page, and the section page lists all six planned pages with the unwritten ones marked as coming soon.
- [x] Each of the five topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input.
- [x] A learner can take any page of this site and say what a crawler gets from it and which stage of the pipeline would stop it, so the page ends with a diagnosis they can reuse on their own sites.

## Out of Scope

| Feature | Reason |
|---------|--------|
| `robots.txt`, the sitemap and canonical URLs for this site | Page 2 (its own feature) adds and explains them |
| Rendering strategies and per-route metadata | Page 3 |
| Social cards, images and JSON-LD | Page 4 |
| `llms.txt` and AI crawler rules | Page 5 |
| International sites, migrations, faceted navigation, programmatic SEO, log analysis, SEO checks in CI | Page 6 |
| Link building, outreach and paid search | Marketing work, not frontend engineering; named in the skill map with one line each |
| Connecting this site to Search Console or analytics | Needs an owner's account; the page shows what the reports mean with sample data, labelled as such |
| Keyword research tooling | Named in the skill map; no tool is wired up |

## User Stories

### P1: Reach the section and the page

- As a learner, I want an SEO section with its pages listed so that I can find SEO topics in one place.
- **Why P1:** Without a route and navigation nothing else can be seen.
- **Independent Test:** From the home page, open SEO, then How search works; the breadcrumbs lead back.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home page is shown THEN the SEO section SHALL appear as a card with a summary and its progress (pages written out of six), linking to the section page.
- [x] AC-002: WHEN the sidebar or the page search is shown THEN it SHALL list the SEO section's six pages; the section page SHALL list them with their summaries and level, the unwritten ones marked as coming soon; opening an unwritten page SHALL show a short "being written" note that links back to the section.
- [x] AC-003: WHEN the How search works page opens THEN it SHALL show breadcrumbs (Handbook, SEO, page), its dates, title, intro and a topic list linking to its five topics.

### P1: The pipeline from URL to result

- As a learner, I want to follow a URL through crawling, rendering, indexing and serving, and see where it can drop out, so that "why isn't my page on Google?" has a method.
- **Why P1:** Every later page works on one stage of this pipeline.
- **Independent Test:** Give a sample page a `noindex` tag and see it stop at indexing with the matching report reason.

**Acceptance Criteria:**

- [x] AC-004: WHEN the topic is shown THEN it SHALL describe each stage (discover, crawl, render, index, serve) with what happens there, what a frontend engineer controls at that stage, and which later page of the section covers it.
- [x] AC-005: WHEN the learner gives a sample page one or more conditions (for example blocked in `robots.txt`, a 404 or 5xx status, a redirect, a `noindex` tag, content that only appears after JavaScript runs, a canonical that points to another URL, a near copy of another page, no links pointing to it) THEN the demo SHALL show the stage where the page stops, the reason a search console would report for it, and the fix; WHEN conditions conflict (for example `noindex` on a page blocked in `robots.txt`) THEN it SHALL explain why the crawler never sees the tag.

### P1: How pages are found

- As a learner, I want to see how a crawler discovers pages through links and sitemaps, so that I build navigation crawlers can follow.
- **Why P1:** A page that is never discovered can't rank, and JavaScript navigation is a common frontend cause.
- **Independent Test:** Turn the sidebar links into click handlers without an `href` and watch the crawl find fewer pages of this site.

**Acceptance Criteria:**

- [x] AC-006: WHEN the demo runs THEN it SHALL crawl a model of this site's real pages (from the handbook's own page list) starting at the home page, following links only, and show each page found with its click depth, and the pages not found.
- [x] AC-007: WHEN the learner changes how links are built (real links, click handlers without an `href`, links only in content loaded after a click, `nofollow` on some links), leaves a page orphaned, or adds or removes a sitemap THEN the crawl SHALL update the pages found, their depth and the share of the site reached; the demo SHALL be labelled as a simplified model and state its assumptions.

### P1: What a crawler sees

- As a learner, I want to see the HTML this site's server sends for a page before any JavaScript runs, so that I know what a crawler reads on its first fetch.
- **Why P1:** It turns "is my content crawlable?" into something the learner can check on any page.
- **Independent Test:** Pick a page of this site; the demo fetches its real HTML and lists its title, description, canonical, robots rules, headings, links and amount of text.

**Acceptance Criteria:**

- [x] AC-008: WHEN the learner picks a page of this site (or the page they are on) THEN the demo SHALL fetch that page's real server HTML and show its status, title, meta description, canonical URL, meta robots, `h1` and other headings, the links it contains and how much text it has, without running the page's JavaScript.
- [x] AC-009: WHEN a field the section later sets up is missing (for example the canonical URL before page 2 ships) THEN the demo SHALL mark it as missing and name the page of this section that adds it, so the list updates on its own as later pages ship.

### P1: Duplicates and canonical URLs

- As a learner, I want to see how one piece of content ends up on many URLs and how a search engine picks one, so that I send clear signals.
- **Why P1:** Duplicate URLs split signals and are behind many "Google chose a different canonical" reports.
- **Independent Test:** Make the sitemap list one URL and the canonical tag point to another, and see the conflict reported.

**Acceptance Criteria:**

- [x] AC-010: WHEN the topic is shown THEN it SHALL list the usual causes of duplicate URLs (protocol and `www`, trailing slashes, letter case, tracking parameters, sort and filter parameters, print or session URLs) and the signals that point to the preferred one (redirects, `rel="canonical"`, sitemap entries, internal links), described as hints a search engine weighs rather than commands.
- [x] AC-011: WHEN the learner sets which variants of a sample URL exist and which signals point where THEN a model SHALL show the URL a search engine would most likely choose, whether the signals agree, and what to change when they conflict; labelled as a simplified model.

### P1: Ranking and measuring

- As a learner, I want to know what ranking systems look at, which popular beliefs are myths, and how search results are measured, so that I spend effort where it counts.
- **Why P1:** Without this, SEO advice reads as a list of superstitions.
- **Independent Test:** Sort a list of claims into "signal" and "myth" and read the reason for each.

**Acceptance Criteria:**

- [x] AC-012: WHEN the topic is shown THEN it SHALL describe what ranking systems weigh (relevance to the query, helpful and reliable content, page experience, links, the searcher's context) and the four numbers a search console reports for search results (impressions, clicks, click-through rate, average position) with what each one does and doesn't tell you.
- [x] AC-013: WHEN the learner sorts a list of common claims (for example meta keywords, word count targets, Core Web Vitals, HTTPS, exact-match domains, `nofollow` links, publishing dates) into signal, myth or "it depends" THEN the page SHALL show the answer, the reason and the source for each, and a summary of agreements when every claim is sorted.

### P2: The skill map

- As a learner, I want a map of what SEO work covers, from simple to expert, and which parts a frontend engineer owns, so that I know what to learn next.
- **Why P2:** It orients the learner, but each page works without it.

**Acceptance Criteria:**

- [x] AC-014: WHEN the section page or the How search works intro is shown THEN it SHALL show the areas of SEO work (technical, content and on-page, authority and links, measurement, AI search) at three levels (basics, intermediate, senior and expert), marking what a frontend engineer usually owns and linking each area to the page that covers it.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-015: WHEN a topic is shown THEN it SHALL end with a short "read more" holding the senior-level points (crawl budget only matters for large sites, `robots.txt` doesn't keep a page out of the index, canonical tags are hints, rankings move for reasons outside your site) and links to the primary sources it draws from (search engine documentation first).

## Edge Cases

- WHEN the crawler-view demo can't fetch a page (offline, or the fetch fails) THEN it SHALL say so and offer to retry, never break the page.
- WHEN the learner picks a page that redirects or returns an error THEN the crawler view SHALL show the status and where the redirect goes instead of an empty result.
- WHEN every link in the crawl model is unfollowable and there is no sitemap THEN the crawl SHALL show that only the home page is found, without an error.
- WHEN the learner gives the pipeline demo no conditions THEN it SHALL show the page indexed and eligible to appear, with a note that eligibility isn't a ranking.
- WHEN a later SEO page is not written yet THEN links to it from this page SHALL lead to its "being written" note.

## Success Criteria

- [x] Every report reason the pipeline demo shows matches a reason in the search engine's documentation, and each claim in the myth sorter cites a primary source.
- [x] The page passes axe in light and dark themes, works at 360 px width without horizontal scroll, and every demo can be used with the keyboard.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

The crawler-view demo (AC-008) fetches real pages of this site from the
reader's browser and reads the HTML without running it, which is what a
crawler gets on its first fetch. The crawl, canonical and pipeline demos are
models and are labelled with their assumptions. Google Search is the reference
engine because it publishes the most documentation; the page says where other
engines differ when it matters. The user asked on 2026-10-22 for the section to
go from simple to senior and expert level, set SEO up for real on this site,
and be built one page at a time.

## Baseline

### Current Behavior

- The handbook has seven sections: React Practices, Browser & Web Platform, Performance & Accessibility, Security, Frontend System Design, Under the Hood and Testing.
- The site sends a title and a description, with no canonical URL, `robots.txt`, sitemap, social cards or structured data.

### Gaps / Limitations

- A learner has nowhere to learn how search engines and AI assistants find, read and rank the pages the handbook teaches them to build.

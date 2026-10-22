---
id: "043"
feature: seo-javascript
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-22
---

# Feature: SEO section, JavaScript and rendering SEO

## Overview

Frontend engineers ship JavaScript apps and are told both "Google runs
JavaScript" and "client-side rendering hurts SEO". Both are partly true. Google
renders pages in a recent Chrome, but rendering waits in a queue, the renderer
never clicks or scrolls, and many other crawlers read only the first HTML. The
common failures are specific: content that appears only after a click, links
built from buttons, a "not found" screen sent with a 200, a title set in an
effect, a `noindex` removed by JavaScript.

This page explains how search engines handle JavaScript, which rendering
strategy each kind of page needs, and the SPA patterns that break crawling. It
adds real lab pages to this site, one per failure, so the demos can compare the
HTML the server sends with what a real browser renders, in the reader's own
browser. It also adds a check of the metadata every route sends in its server
HTML.

## Goals

- [x] The site has lab pages that reproduce each JavaScript failure the page explains, kept out of search with `noindex` and out of the sitemap.
- [x] Each of the five topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input; three of them compare real server HTML with the real rendered page.
- [x] A learner can check every route of this site for a title, description, canonical URL and a single `h1` in the server HTML, and see duplicates.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Social cards, images and JSON-LD | Page 4 |
| AI crawlers' JavaScript support in depth | Page 5 |
| Core Web Vitals and performance tuning | Covered by the Performance page; linked |
| Running a real Googlebot or the URL Inspection tool | Needs Search Console; the demos render in the reader's browser and say how that differs |
| Changing this site's rendering strategy | It's already static; the page explains why |

## User Stories

### P1: Lab pages on this site

- As a learner, I want real pages that show each JavaScript failure, so that the demos compare real responses.
- **Why P1:** The three comparison demos read them.
- **Independent Test:** Open each lab page; view its source; it has `noindex` and isn't in the sitemap.

**Acceptance Criteria:**

- [x] AC-001: WHEN a lab page is requested THEN the site SHALL serve one page per case: content rendered on the server, the same content rendered only in the browser, a title and description set only by JavaScript, a "not found" screen sent with status 200, links built in crawlable and uncrawlable ways, and content that appears only after a click or a scroll event; an unknown case SHALL return a real 404.
- [x] AC-002: WHEN a lab page is served THEN it SHALL carry `noindex`, SHALL NOT be listed in the sitemap, and SHALL NOT be blocked in robots.txt, so crawlers can read the `noindex`.

### P1: How search engines render JavaScript

- As a learner, I want to compare a page's server HTML with what a browser renders, so that I know what each kind of crawler sees.
- **Why P1:** Everything else on the page builds on the two passes.
- **Independent Test:** Pick the client-rendered lab page; its server HTML has no article text, the rendered page has it.

**Acceptance Criteria:**

- [x] AC-003: WHEN the topic is shown THEN it SHALL explain crawling, the render queue and indexing; that Google renders with a recent Chrome without clicking, scrolling, granting permissions or keeping storage and cookies between pages; that it may skip rendering a `noindex` page; and that many other crawlers read only the server HTML.
- [x] AC-004: WHEN the learner picks a lab page THEN the demo SHALL fetch its server HTML and render it in a hidden frame in the learner's browser, then show side by side the title, description, `h1`, amount of text, links and the case's marker sentences in each, and say which crawlers would see what.

### P1: Choosing a rendering strategy

- As a learner, I want to pick a rendering strategy for a kind of page from what it needs, so that I can defend the choice.
- **Why P1:** "SSR or CSR for SEO?" is a standard interview question.
- **Independent Test:** Say a page must rank, is the same for everyone and changes hourly; see static with revalidation recommended.

**Acceptance Criteria:**

- [x] AC-005: WHEN the topic is shown THEN it SHALL compare client rendering, server rendering on each request, static generation and static with revalidation (and streaming) on what the first HTML holds, server cost, freshness and fit for search, name the Next.js way to choose each, note that this site's pages are static, and say that dynamic rendering for bots is a workaround Google no longer recommends.
- [x] AC-006: WHEN the learner answers whether a page must appear in search, whether it differs per visitor, and how often it changes THEN the demo SHALL recommend a strategy with the reason, the Next.js code that selects it, and what it costs.

### P1: Metadata in the server HTML

- As a learner, I want to check every route's metadata in the server HTML, so that I trust what crawlers read.
- **Why P1:** Titles and canonicals set late or duplicated are a common, silent failure.
- **Independent Test:** Run the check; every route has one title, a description, a canonical and one `h1`, and no two routes share a title.

**Acceptance Criteria:**

- [x] AC-007: WHEN the topic is shown THEN it SHALL explain the Next.js Metadata API (`metadata`, `generateMetadata`, title templates), that tags set in an effect only reach crawlers that render, and that Next.js streams metadata into the body for crawlers that run JavaScript and blocks for those that don't (`htmlLimitedBots`).
- [x] AC-008: WHEN the learner runs the check THEN the demo SHALL fetch every URL in this site's sitemap and report, per URL, the title, its length, the description and its length, the canonical, and the number of `h1` elements, and flag missing values, duplicates across URLs, more or fewer than one `h1`, and titles or descriptions long enough to be cut off in results.

### P1: Links, routing and soft 404s

- As a learner, I want to see which navigation a crawler can follow and how a single-page app should answer for missing content, so that routing doesn't hide pages.
- **Why P1:** Router misuse is the most common frontend cause of undiscovered pages and soft 404s.
- **Independent Test:** Check the links lab page: the `<a href>` link is crawlable, the button and the `#/` link aren't. Check the soft-404 lab page: it's flagged as a soft 404, and the real missing page as a 404.

**Acceptance Criteria:**

- [x] AC-009: WHEN the topic is shown THEN it SHALL explain that only `<a href>` links with real URLs are followed, the History API over fragments, Next.js `<Link>`, paginated URLs for infinite lists, and the two ways to avoid soft 404s in an app (a real 404 status, or `noindex` on the error view).
- [x] AC-010: WHEN the learner runs the check THEN the demo SHALL list every navigation element on the links lab page after rendering, with its element, URL and whether a crawler can follow it and why; and SHALL compare the soft-404 lab page with a real missing page on status, the "not found" text and `noindex`, naming the soft 404.

### P1: Content behind interaction

- As a learner, I want to see which content a renderer gets without interacting, so that I don't hide content behind clicks.
- **Why P1:** Tabs, "load more" and scroll handlers are everywhere.
- **Independent Test:** On the interaction lab page, the text in a closed `<details>` is seen, the text loaded on click and on the scroll event isn't, until the demo clicks and scrolls.

**Acceptance Criteria:**

- [x] AC-011: WHEN the topic is shown THEN it SHALL explain that content in the DOM is read even when visually hidden, that content loaded only on a click or a scroll event is missed, that loading when content enters the viewport (`IntersectionObserver`, `loading="lazy"`) works, and that infinite scroll needs paginated URLs.
- [x] AC-012: WHEN the learner runs the demo THEN it SHALL show for each marker sentence on the interaction lab page whether it is in the server HTML, in the rendered page without interaction, and after the demo clicks the button and scrolls, with what a crawler indexes.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-013: WHEN a topic is shown THEN it SHALL end with a short "read more" holding the senior-level points (render queue delays, aggressive resource caching and fingerprinted assets, `noindex` pages may not be rendered, testing with the URL Inspection tool) and links to the primary sources it draws from.

## Edge Cases

- WHEN the frame doesn't finish loading within a few seconds THEN the demo SHALL show what it has with a note, and offer a retry.
- WHEN a fetch fails THEN the demo SHALL say so and offer to retry, never break the page.
- WHEN the metadata check finds no problems THEN it SHALL say so explicitly.
- WHEN the learner answers the strategy questions in a combination with no clear winner (personal and must rank) THEN the demo SHALL explain the split (render the public part on the server, the personal part on the client).

## Success Criteria

- [x] Every lab page behaves as described in both the server HTML and the rendered page, checked in the browser.
- [x] The metadata check reports no missing titles, descriptions or canonicals and no duplicate titles on this site (fixing any it finds).
- [x] The page passes axe in light and dark themes (apart from the site-wide sidebar finding noted in 041), works at 360 px width without horizontal scroll, and every demo can be used with the keyboard.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

The rendered side of each comparison runs in the reader's browser, which runs
JavaScript like Google's renderer but differs from it (no render queue, a
normal viewport, the reader's storage). The page says so next to the demo.
Sources: Google's JavaScript SEO basics, lazy-loading and "fix JavaScript
issues" guides, the dynamic rendering page, and the bundled Next.js 16 docs on
streaming metadata and `htmlLimitedBots`.

## Baseline

### Current Behavior

- Every handbook page is statically generated, so its server HTML holds the full text and metadata.
- The site has no example of the JavaScript patterns that break crawling.

### Gaps / Limitations

- A learner can't see the difference between server HTML and rendered HTML on a real page, or check that every route's metadata is in the server HTML.

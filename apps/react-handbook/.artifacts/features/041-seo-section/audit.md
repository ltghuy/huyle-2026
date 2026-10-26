---
id: "041"
feature: seo-section
created: 2026-10-22
---

# Audit: SEO section + "How search works"

## Goals

- [x] The section and the page are one click from the sidebar and the home page, and the section lists all six planned pages: the home card shows "1 of 6 pages written" and links to `/seo`; `/seo` shows six cards, each with its level (1 Written, 5 Coming soon); the sidebar and the page search list the SEO folder; the five unwritten URLs render the "being written" note (200), and unknown slugs return 404.
- [x] Five topics, each about a screen of reading with a demo whose result changes with input: pipeline conditions with the stopping stage and report reason, a crawl of this site's 50 pages by link style, a fetch of any page's real server HTML, URL variants against canonical signals, and a claim sorter. Every demo was driven by script in the browser.
- [x] The crawler view and the pipeline demo together give a reusable diagnosis: what the server HTML holds for any page of this site, and which stage stops a page with a given problem, with the fix.

## Success Criteria

- [x] Every reason the pipeline demo shows is a heading of the Page indexing report, copied verbatim on 2026-10-22 (`.artifacts/research/seo-fundamentals.md`); every claim in the sorter links its primary source, and all 17 cited URLs answered 200.
- [x] axe in light and dark: no violations from this page; the only finding, `region` on the sidebar shell, also appears on the live site's existing pages and predates this feature. No horizontal overflow at 360 px. Every control is a native radio, checkbox, button, summary or Base UI select.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Notes

- Pipeline: no conditions gives "Page is indexed"; robots.txt plus noindex stops at crawl with the "never read" note; 404 stops at crawl; content that needs JavaScript passes with the rendering note.
- Crawl: all real links finds 50 of 50 at depth 1; click handlers everywhere finds only the home page; the sitemap then adds the other 49; an orphan is listed as never found; `nofollow` on the sidebar leaves the pages reachable through the cards at depth 2.
- Crawler view: `/practices` shows 200 after a redirect to `/react-practices`; `/seo/no-such-page` shows 404; a rejected fetch shows the error and "Try again", which recovers. The canonical URL, social card and structured data show as missing with a link to the page that adds them.

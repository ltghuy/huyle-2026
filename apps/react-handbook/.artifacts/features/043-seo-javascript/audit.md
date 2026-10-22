---
id: "043"
feature: seo-javascript
created: 2026-10-22
---

# Audit: SEO, JavaScript and rendering SEO

## Goals

- [x] Seven lab pages at `/seo-lab/*` reproduce the patterns (server, client-only, title set by JavaScript, soft 404 with and without `noindex`, links, interaction); each answers 200 with `X-Robots-Tag: noindex`, none is in the sitemap, robots.txt allows them, and an unknown lab is a 404.
- [x] Five topics with demos whose result changes with input; three (render comparison, links and soft 404s, interaction) compare real server HTML with the page rendered in a frame.
- [x] The metadata check fetched all 47 sitemap URLs: one title and one `h1` each, a description, a canonical matching the URL, no duplicate titles or descriptions.

## Success Criteria

- [x] Labs behave as described: the client-only article is missing from the server HTML and present after rendering; the client title and description exist only after rendering; in the interaction lab, the HTML and `<details>` sentences are in the server HTML, the mount sentence appears after rendering, and the click and scroll sentences only after the demo interacts; only the two `<Link>` elements are followed; the 200 "not found" page is flagged as a soft 404, the `noindex` variant and the real 404 aren't.
- [x] Metadata check: no missing values or duplicates (19 pages have a long title or description, reported as "may be cut off", not as errors).
- [x] axe in light and dark: no findings from this page after giving each comparison region its own label; no horizontal overflow at 360 px with every demo run.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Notes

- Found while building: Next.js writes its `<title>` back after hydration, so a title set at once in an effect is lost; React 19 replaces `javascript:` URLs with one that throws; props passed to client components are serialized into the server HTML's inline RSC payload (recorded in knowledge.md).

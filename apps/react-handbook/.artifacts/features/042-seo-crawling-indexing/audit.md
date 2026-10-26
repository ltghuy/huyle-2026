---
id: "042"
feature: seo-crawling-indexing
created: 2026-10-22
---

# Audit: SEO, Crawling and indexing control

## Goals

- [x] The site's setup: `/robots.txt` returns `User-Agent: *`, `Allow: /` and the absolute sitemap URL; `/sitemap.xml` lists 46 indexable URLs with `lastmod` from each page's last content change and no placeholders; every page's HTML has a self-referencing absolute canonical (home, section pages, practices, topic pages); placeholder pages send `noindex, follow`; `/api/*` responses carry `X-Robots-Tag: noindex`, and `/api/` isn't blocked.
- [x] Five topics, each about a screen of reading with a demo whose result changes with input; four read this site live (robots.txt, sitemap audit, robots rules site check, canonical check) and one is an exercise (status codes).
- [x] The How search works crawler view now shows the canonical URL as present, with no change to its code.

## Success Criteria

- [x] The sitemap audit fetched all 46 URLs: every one answers 200, doesn't redirect, isn't noindex, and names itself as canonical.
- [x] Canonical equals the page's own URL for every sitemap URL (audit above) and by `curl` for the home, section and topic pages.
- [x] axe in light and dark: only the site-wide sidebar `region` finding noted in 041. No horizontal overflow at 360 px with every demo opened. Every control is a native input, textarea, radio, checkbox, button or Base UI select.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass; `/robots.txt` and `/sitemap.xml` build as static files.

## Notes

- Tester: the sample file blocks `/seo/ai-search` for Bingbot (longest rule `Disallow: /seo/`) and allows `/seo/how-search-works` (longer `Allow`); Googlebot follows only its own group; `Disallow: /*.json$` blocks `/a.json` and not `/a.json?x=1`; equal-length Allow and Disallow resolve to Allow; no matching group allows everything; `Crawl-delay` is listed as ignored; a path without a leading slash is corrected with a note.
- Site check: this page has no rules (defaults), `/seo/ai-search` sends `noindex, follow`, `/api/health` sends the header, `/seo/no-such-page` is a 404 with the `noindex` Next.js adds.
- Canonical check: the trailing slash redirects (308) to the clean URL; `?utm_source=newsletter` answers 200 with the clean canonical; `/SEO/Crawling-Indexing` is a 404.

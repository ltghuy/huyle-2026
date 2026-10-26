---
slug: seo-structured-data
completed: 2026-10-26
---

# Summary: Bring site SEO up to the Frontend Handbook baseline

## What Changed

Compared the site's SEO with `react-practices` (and its `.artifacts/research/seo-fundamentals.md`) and closed the gaps. Structured data moved to a `JsonLd` helper that escapes `<`, and grew from one Person node to a linked Person / WebSite / ProfilePage graph (adds `worksFor`). Metadata gained Google preview directives (`max-image-preview:large`, `max-snippet:-1`), `og:type=profile` with first name, last name and username, and author fields. The sitemap now reports the real content date instead of the build time and drops the priority/changefreq values Google ignores. robots.txt drops the Yandex-only `host`. Unlike the Handbook, all AI crawlers stay allowed because this site wants to be discovered as widely as possible.

## Files Modified

| File | Change |
|------|--------|
| src/lib/jsonLd.tsx | New: escaped `JsonLd` component + `siteGraph()` schema graph |
| src/app/layout.tsx | Robots/googleBot directives, profile OG, authors; uses `siteGraph` |
| src/app/sitemap.ts | `lastModified: profile.updated`, image entry, no priority/changefreq |
| src/app/robots.ts | Removed `host`; documented the allow-all choice |
| src/content/profile.ts | New `updated` field (last content change) |

## Patterns Discovered

- `profile.updated` must be bumped by hand when content changes; it drives the sitemap lastmod and ProfilePage dateModified.

## Follow-Up

- Set `GOOGLE_SITE_VERIFICATION` in the deploy env, submit the sitemap in Search Console, and run the Rich Results Test after deploy.
- Vietnamese copy is a client-side swap on one URL, so it can't have hreflang; ranking it separately needs a `/vi` route.

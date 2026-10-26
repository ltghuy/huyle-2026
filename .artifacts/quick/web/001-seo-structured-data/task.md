---
slug: seo-structured-data
status: done
branch: seo-structured-data
created: 2026-10-26
---

# Quick Task: Bring site SEO up to the Frontend Handbook baseline

## What

Close the SEO gaps found by comparing against `react-practices` (escaped JSON-LD, richer schema graph, Google preview directives, an accurate sitemap).

## Files

- src/lib/jsonLd.tsx (new)
- src/app/layout.tsx
- src/app/sitemap.ts
- src/app/robots.ts
- src/content/profile.ts

## Expected Outcome

- JSON-LD is escaped and emits a linked Person / WebSite / ProfilePage graph.
- `<meta name="googlebot">` allows large image previews and full snippets; `og:type` is `profile`.
- The sitemap `lastmod` is the real content date (`profile.updated`), with no ignored priority/changefreq.
- robots.txt still allows every crawler and advertises the sitemap.

## Quality Gates

Run after the change, before marking done:

- yarn eslint src
- yarn tsc --noEmit -p .
- yarn test
- yarn build (then check `/`, `/robots.txt`, `/sitemap.xml` on `yarn start`)

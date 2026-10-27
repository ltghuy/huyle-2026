---
slug: english-routes-seo
completed: 2026-10-27
---

# Summary: English routes, collapsed sidebar, "English with Evan" name, SEO, tour placement

## What Changed

Every route folder and query key is now English (`/vocabulary`, `/grammar`, `/review`, `/exercises`, `/hard-words`, `/profile`, `/settings`, `/credits`, `/lesson`, `/placement`, `/review-session`; `?topic=`, `?word=`, `?type=`). The old Vietnamese paths 308-redirect to the new ones, and old query keys are mapped too. The redirects were checked on `next dev` and on the OpenNext preview. The app is called "English with Evan" in the tab title, sidebar and welcome dialog. SEO: `metadataBase`, a Vietnamese description, keywords and author in the root layout. Each page gets its own title, description, canonical, Open Graph and Twitter tags from `pageMetadata`. A generated share image and an icon were added. `sitemap.xml` lists the five content pages and `robots.txt` points to it. Personal pages and focus screens are `noindex, follow`, and API responses send `X-Robots-Tag: noindex`. When the sidebar is collapsed, its `lg` menu buttons now centre the icon and hide the label; before, the first letter of each label showed. The tour puts its card beside a target only when there is 352px of room to the right, and below it otherwise, so the first step no longer gets clipped at the left edge next to the full-width lesson card.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/app/(app)/*`, `(focus)/*` | Folders renamed; per-page `pageMetadata` |
| `apps/learn-english/src/lib/site.ts` | New: site constants, share images, `pageMetadata` |
| `apps/learn-english/src/app/layout.tsx` | SEO defaults, new name |
| `apps/learn-english/src/app/{sitemap,robots}.ts`, `opengraph-image.tsx`, `twitter-image.tsx`, `icon.svg` | New |
| `apps/learn-english/next.config.ts` | Redirects for old routes and keys; API noindex header |
| `apps/learn-english/src/components/shell/{nav.ts,app-sidebar.tsx,mobile-nav.tsx}` | New hrefs; collapsed sidebar fix; name |
| `apps/learn-english/src/components/tour/tour-steps.ts` (+ new test), `app-tour.tsx` | Room-aware `sideFor`; name in welcome dialog |
| Grammar, vocabulary, exercise library, review, lesson, settings components; `src/lib/session/prepare.ts`; tests and e2e specs | New paths and query keys |
| `.artifacts/features/learn-english/001-learn-english-app/{design,tasks}.md`, `content/sources/SOURCES.md` | Route names updated |

## Patterns Discovered

A page-level `openGraph`/`twitter` object hides the root `opengraph-image` file, so name the image in config (recorded in `.agents/knowledge.md`).

## Follow-Up

Grammar topics and words are only reachable through query params on client-rendered pages, so search engines see the page shell rather than each topic. If topics should rank on their own, give them prerendered pages. After deploying, submit `https://english.huyle.work/sitemap.xml` in Google Search Console.

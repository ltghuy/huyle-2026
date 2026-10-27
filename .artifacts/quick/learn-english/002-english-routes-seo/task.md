---
slug: english-routes-seo
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Quick Task: English routes, collapsed sidebar, "English with Evan" name, SEO, tour placement

## What

Rename every route and query key to English (old Vietnamese URLs redirect permanently), fix the collapsed sidebar, rename the app to "English with Evan", add SEO metadata, a sitemap and robots, and keep the first tour step card on screen.

## Files

- `apps/learn-english/src/app/(app)/*`, `apps/learn-english/src/app/(focus)/*` (folders renamed)
- `apps/learn-english/next.config.ts` (redirects)
- `apps/learn-english/src/components/shell/{nav.ts,app-sidebar.tsx,mobile-nav.tsx}`
- `apps/learn-english/src/app/layout.tsx`, `apps/learn-english/src/app/{sitemap,robots}.ts`
- `apps/learn-english/src/components/tour/{tour-steps.ts,app-tour.tsx}`
- Links, tests and e2e specs that named the old routes; `001-learn-english-app/design.md`, `tasks.md`

## Expected Outcome

Routes: `/vocabulary`, `/grammar`, `/review`, `/exercises`, `/hard-words`, `/profile`, `/settings`, `/credits`, `/lesson`, `/placement`, `/review-session`. Query keys: grammar `?topic=`, vocabulary `?word=`, exercises `?type=`. Old paths answer 308 to the new ones, with their query string kept.
The collapsed sidebar shows centred icons only. The tab title, sidebar and welcome dialog say "English with Evan".
Every page has its own title and description, canonical URL, Open Graph and Twitter tags; `/sitemap.xml` lists the navigable pages and `/robots.txt` points to it (focus screens and the API are not indexed).
The first tour step sits below the wide lesson card instead of being cut off at the left edge.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`

---
slug: home-json-ld
status: done
branch: feature/learn-english
created: 2026-10-29
---

# Quick Task: Structured data on the home page, Vietnamese sidebar toggle text

## What

Two small SEO fixes found while checking why english.huyle.work isn't in Google yet: the home page gets JSON-LD (`WebSite` and `Course`), and the sidebar toggle's hidden text "Toggle Sidebar" becomes Vietnamese, since it was the only English UI text in the server HTML.

## Files

- `apps/learn-english/src/lib/json-ld.tsx` (new) and its test
- `apps/learn-english/src/app/(app)/page.tsx`
- `apps/learn-english/src/components/ui/sidebar.tsx` (CLI-owned; one string changed)

## Expected Outcome

The home page HTML has one `application/ld+json` script with a graph of the `WebSite` and a free `Course` (Vietnamese, A1 to C1, provided by the author). `<` in values is escaped so the script can't be closed early. The toggle's screen-reader text reads "Thu gọn hoặc mở rộng thanh bên".

## Quality Gates

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

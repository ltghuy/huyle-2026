---
slug: section-index-divider
status: done
branch: main
created: 2026-10-26
---

# Quick Task: Divider between the header and the cards on section pages

## What

Put a horizontal divider between the page header (breadcrumbs, title, intro, progress) and the card grid on every section page: React Practices and the seven pages built from the shared section index (Browser & Web Platform, Performance & Accessibility, Security, SEO, System Design, Testing, Under the Hood).

## Files

- apps/react-handbook/src/app/(playground)/react-practices/page.tsx
- apps/react-handbook/src/components/playground/section-index.tsx

## Expected Outcome

A one-pixel divider in the border color spans the content width between the progress line and the first row of cards, with the existing gap above and below it, on all eight section pages, in light and dark mode. It uses the shadcn `Separator`. No copy changes; no spec AC describes the page at this level, so no spec update.

## Quality Gates

Run after the change, before marking done:

- pnpm --filter react-handbook lint
- pnpm --filter react-handbook typecheck
- pnpm --filter react-handbook build

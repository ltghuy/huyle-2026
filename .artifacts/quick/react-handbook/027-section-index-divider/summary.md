---
slug: section-index-divider
completed: 2026-10-26
---

# Summary: Divider between the header and the cards on section pages

## What Changed

Every section page now has a horizontal divider between its header (breadcrumbs, title, intro and progress line) and its card grid. React Practices builds its own header, and the seven other section pages share the section index component, so the divider went into both. It is the shadcn `Separator` placed in the page's existing column, which already spaces items 2rem apart, so the line sits with the same gap above and below it. No copy changed and no spec described the page at this level.

## Files Modified

| File | Change |
|------|--------|
| apps/react-handbook/src/app/(playground)/react-practices/page.tsx | `Separator` between header and card list |
| apps/react-handbook/src/components/playground/section-index.tsx | Same, for the seven shared section pages |

## Verification

Lint and typecheck exit 0; the build passes. On a local production build each of the eight section pages renders exactly one separator, directly after the header. A screenshot of React Practices shows the line between the progress line and the first row of cards.

## Patterns Discovered

- React Practices doesn't use the shared section index component, so changes to the section page layout have to be made in both files.

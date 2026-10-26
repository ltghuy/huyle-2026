---
slug: card-date-badges
status: done
branch: main
created: 2026-10-25
---

# Quick Task: Show the page date on index cards in place of the Built and Written badges

## What

On the React Practices index and the topic section indexes, replace each card's green "Built" or "Written" badge with a green badge that reads "Updated {date}" or "Created {date}", using the same rule as the page header.

## Files

- src/components/playground/page-dates.tsx (adds the badge form of the date)
- src/app/(playground)/react-practices/page.tsx
- src/components/playground/section-index.tsx
- .artifacts/features/react-handbook/034-page-dates/spec.md (cards come into scope, new AC-005)

## Expected Outcome

Each built or written card shows a green pill with a calendar icon and "Updated Oct 13, 2026", or "Created Oct 8, 2026" when the page hasn't changed since it was created, with the date in a `time` element. Cards for pages that aren't built or written yet keep the "Coming soon" badge. The level tag on topic cards stays next to the badge.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

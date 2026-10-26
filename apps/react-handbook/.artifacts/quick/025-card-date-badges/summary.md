---
slug: card-date-badges
completed: 2026-10-25
---

# Summary: Show the page date on index cards in place of the Built and Written badges

## What Changed

Cards on the React Practices index and the topic section indexes now show a green date badge where the "Built" or "Written" badge was. It reads "Updated {date}", or "Created {date}" when the page hasn't changed since it was created, which is the same rule and format as the page header. In the build, the React Practices index shows 11 "Updated" and 3 "Created" badges, and no "Built" badges are left. Cards for pages that aren't built or written yet keep "Coming soon". The page header and the card badge share one `PageDate` component in `page-dates.tsx`.

## Files Modified

| File | Change |
|------|--------|
| src/components/playground/page-dates.tsx | Shared `PageDate` text; new `DateBadge` pill |
| src/app/(playground)/react-practices/page.tsx | Practice cards show `DateBadge` when built |
| src/components/playground/section-index.tsx | Topic cards show `DateBadge` when written |
| .artifacts/features/034-page-dates/spec.md | Index cards in scope, AC-005, "Coming soon" edge case covers cards |

## Patterns Discovered

None

## Follow-Up

`StatusBadge` is now only rendered with `built={false}`, so its ready state and `readyLabel` prop are unused. It could be cut down to a "Coming soon" badge.

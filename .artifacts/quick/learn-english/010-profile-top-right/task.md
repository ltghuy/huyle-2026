---
slug: profile-top-right
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: Profile link in the top-right corner, greeting beside it

## What

Move "Hồ sơ" out of the sidebar (and the mobile "Thêm" sheet) into the top-right corner of every page header, with "👋 Chào {tên}!" on its left instead of above the home lesson card.

## Files

- `src/components/shell/account-link.tsx` (new): greeting + profile link, reads the learner's name
- `src/components/shell/page-header.tsx`: render it at the right of the title row
- `src/components/shell/nav.ts`: drop `/profile` from `NAV_ITEMS`
- `src/components/lesson/today-lesson.tsx`: drop the home greeting
- `.artifacts/features/learn-english/003-learner-name/spec.md`: AC-006 wording

## Expected Outcome

Every page with navigation shows the greeting and profile link in their own row above the title on phones (greeting left, 44px button right) and at the right of the title row from `md` up: "👋 Chào {tên}!" followed by a round profile icon button linking to `/profile` (highlighted when on it). The sidebar and the "Thêm" sheet no longer list "Hồ sơ". The tour's "Hồ sơ" step points at the new button (`data-tour="profile"`), so it still has 8 steps. Long names truncate; with no name yet, only the icon shows.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`

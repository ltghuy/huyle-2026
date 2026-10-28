---
slug: profile-top-right
completed: 2026-10-28
---

# Summary: Profile link in the top-right corner, greeting beside it

## What Changed

"Hồ sơ" left the sidebar and the mobile "Thêm" sheet. It is now a round icon link (`AccountLink`) in every page header, with "👋 Chào {tên}!" to its left. On phones the pair gets its own row above the title, so the title keeps the full width; from `md` up it sits at the right end of the title row. The home screen no longer shows its own greeting above the lesson card, and 003 AC-006 now says where the greeting lives. The tour still has 8 steps, because the "Hồ sơ" step finds the new link through `data-tour="profile"`.

## Files Modified

| File | Change |
|------|--------|
| `src/components/shell/account-link.tsx` | New: greeting plus profile link, active state on `/profile`, 44px on phones |
| `src/components/shell/page-header.tsx` | Renders `AccountLink`; wraps on phones so it comes first |
| `src/components/shell/nav.ts` | `/profile` removed from `NAV_ITEMS` |
| `src/components/lesson/today-lesson.tsx` | Home greeting removed |
| `src/app/globals.css` | Comment on `animate-wave` |
| `src/app/(app)/page.test.tsx` | Mock `usePathname` |
| `.artifacts/features/learn-english/003-learner-name/spec.md` | AC-006 wording |

## Patterns Discovered

None.

## Follow-Up

The 👋 now waves on each page navigation, not only on home. Not run: `pnpm e2e` (Cloudflare preview). `first-visit.spec.ts` still looks for "Chào Minh Anh!", which the header shows.

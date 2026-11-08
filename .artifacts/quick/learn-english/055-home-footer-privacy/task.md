---
slug: home-footer-privacy
status: done
branch: main
created: 2026-11-08
---

# Quick Task: Home page footer with the privacy link

## What

Add a footer to the home page, like engdailystreak.com: a copyright line and a note naming Nghị định 13/2023/NĐ-CP and 147/2024/NĐ-CP on the left, a "Quyền riêng tư" link to `/privacy` on the right.

## Files

- `apps/learn-english/src/components/home/home-footer.tsx` (new)
- `apps/learn-english/src/app/(app)/page.tsx`
- `apps/learn-english/src/app/(app)/page.test.tsx`
- `.artifacts/features/learn-english/019-home-landing/spec.md` (footer was out of scope; now AC-007)

## Expected Outcome

The privacy note is reachable from the bottom of the home page without signing in or opening Settings. The existing links in Settings and the sign-in prompt stay (022 AC-025).

## Quality Gates

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`

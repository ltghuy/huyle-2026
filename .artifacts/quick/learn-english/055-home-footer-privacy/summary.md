---
slug: home-footer-privacy
completed: 2026-11-08
---

# Summary: Home page footer with the privacy link

## What Changed

The home page now ends with a footer modelled on engdailystreak.com. The left side has the copyright line and a note naming Nghị định 13/2023/NĐ-CP and 147/2024/NĐ-CP. The right side has a "Quyền riêng tư" link to `/privacy`, so anyone can reach the privacy note without signing in. The links in Settings and the sign-in prompt stay, because 022 AC-025 requires them. Spec 019 had "a footer" out of scope, so that row now covers only contacts and donations, and AC-007 describes the footer.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/home/home-footer.tsx` | New server component for the footer |
| `apps/learn-english/src/app/(app)/page.tsx` | Renders the footer after the closing band |
| `apps/learn-english/src/app/(app)/page.test.tsx` | Test for the footer note and privacy link |
| `.artifacts/features/learn-english/019-home-landing/spec.md` | Out of Scope row narrowed, AC-007 added |

## Patterns Discovered

None

## Follow-Up

- Feature 029 added the "Điều khoản" link and the `/terms` page, and moved the footer to `src/components/shell/site-footer.tsx` in the `(app)` layout so it ends every page with navigation.
- The year comes from `new Date()` at build time, since `/` is prerendered. It updates on the next deploy.
- The owner should confirm the legal citations are still current.

---
slug: home-signature
completed: 2026-10-12
---

# Summary: Add the "HUY LE" signature to the end of the home page

## What Changed

Added a `Signature` Server Component at the end of the home page: "Software Engineer · AI-Native Development", a "HUY LE" wordmark in Fredoka 700 (via `next/font`, loaded only by this component), a divider, and "© {year} Le Tran Gia Huy · Designed, built & slightly over-thought". The portfolio's green glow is replaced by a radial `--muted` gradient so it follows the site's theme tokens. AC-014 updated first; lint, typecheck and build pass; checked in a browser at 1400 px and 390 px.

## Files Modified

| File | Change |
|------|--------|
| src/components/playground/signature.tsx | new: signature footer |
| src/app/(playground)/page.tsx | renders `<Signature />` last |
| .artifacts/features/001-practice-playground/spec.md | AC-014 mentions the signature |

## Patterns Discovered

None.

## Follow-Up

The year comes from `new Date()` at build time on this static page, so it updates on the next deploy, not on Jan 1.

---
slug: home-signature
status: done
branch: main
created: 2026-10-12
---

# Quick Task: Add the "HUY LE" signature to the end of the home page

## What

End the home page with an author sign-off: role line, a large rounded "HUY LE" wordmark, a divider and a copyright line, after the portfolio's footer.

## Files

- src/components/playground/signature.tsx
- src/app/(playground)/page.tsx
- .artifacts/features/react-handbook/001-practice-playground/spec.md (AC-014)

## Expected Outcome

The last block on `/` is the signature, styled with theme tokens so it works in light and dark mode, and still a Server Component.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

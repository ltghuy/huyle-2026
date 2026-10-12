---
slug: favicon
status: done
branch: main
created: 2026-10-12
---

# Quick Task: Replace the default Next.js favicon with the handbook mark

## What

Swap the create-next-app favicon for the sidebar brand mark (lucide `BookOpenText` on a `--primary` rounded square).

## Files

- src/app/icon.svg
- src/app/favicon.ico
- src/app/apple-icon.png

## Expected Outcome

Browser tabs, bookmarks and iOS home-screen icons show the handbook book mark instead of the Next.js logo.

## Quality Gates

Run after the change, before marking done:

- pnpm build

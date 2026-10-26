---
slug: humanize-prose
status: done
branch: main
created: 2026-10-13
---

# Quick Task: Humanize the reading text across the site

## What

Edit the prose on every page with the `humanizer` skill: each practice's "How it works" guide, every handbook topic page, the system-design prose, the catalog descriptions, the home page and the README. Remove AI writing tells (staged contrasts, one-line closers, forced triads, dashes, decorative bold, curly quotes, stock words) without changing what the text says.

## Files

- src/practices/*/explanation.tsx
- src/practices/catalog.ts (description strings only)
- src/handbook/*/content.tsx
- src/handbook/system-design/{autocomplete,news-feed,framework,...}.ts(x) (prose only)
- src/app/(playground)/page.tsx
- README.md

## Expected Outcome

Same facts, links, code, component structure and behavior; the prose reads plainly. No em or en dashes in prose. Specs are unaffected because no behavior changes.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

---
slug: full-width-text
status: done
branch: main
created: 2026-10-21
---

# Quick Task: Let page text use the full content width

## What

Remove the `max-w-2xl` and `max-w-3xl` caps on page summaries, topic intros and section text so they span the full content column like the demos do.

## Files

Mechanical class removal, one class per file, across the page frames and handbook content:

- src/components/playground/topic-frame.tsx, practice-frame.tsx, section-index.tsx
- src/handbook/topic.tsx and each `src/handbook/**/content.tsx` intro (plus the networking note at line 230, news-feed.tsx and autocomplete.tsx)
- src/app/(playground)/page.tsx and src/app/(playground)/react-practices/page.tsx

The `max-w-xs`, `max-w-sm` and `max-w-md` caps on demo inputs and controls stay.

## Expected Outcome

Summaries, intros and section prose wrap at the edge of the content column instead of stopping at 42rem or 48rem.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- pnpm build

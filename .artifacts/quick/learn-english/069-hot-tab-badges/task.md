---
slug: hot-tab-badges
status: done
branch: main
created: 2026-11-12
---

# Quick Task: "Hot" badge on the Viết câu and Nghe chép tabs

## What

The "Viết câu" and "Nghe chép" tabs of the exercise library carry a "Hot" badge, so learners notice the two newest practice areas.

## Files

- `apps/learn-english/src/components/library/exercise-library.tsx`
- `apps/learn-english/src/components/library/exercise-library.test.tsx`

## Expected Outcome

- When the tab row is at least 760 px wide, the two tabs show a small flame-and-"HOT" pill after their count, in the streak colour (theme token, so dark mode follows)
- Narrower, a small flame sits on the tab's top-right corner and takes no width, so the tabs still fit a 320 px screen without horizontal scroll
- The tab row switches counts, icons and pills by its own width (container queries), since the four tabs from feature 040 overflowed between about 640 and 1100 px screens
- Each of the two tabs' accessible names includes "Hot"; "Từ vựng" and "Ngữ pháp" have no badge

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

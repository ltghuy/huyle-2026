---
slug: tour-update
status: done
branch: main
created: 2026-10-30
---

# Quick Task: Bring the first-visit tour up to date

## What

The tour (001 AC-039) covers the app as it was at launch. It now also points at the streak and points summary, which explains the streak board and buying extra lessons (feature 013), and at Động từ bất quy tắc (008). The step texts now say what the areas do today: 20 points a day, Chuyên ngành sets, dictation and find the error, and the board in Settings.

## Files

- `src/components/tour/tour-steps.ts`: 10 steps instead of 8, new texts
- `src/components/tour/tour-steps.test.ts`: every menu item and the streak summary has a step
- `e2e/specs/first-visit.spec.ts`, `e2e/specs/tour.mobile.spec.ts`: step counter and order
- `.artifacts/features/learn-english/001-learn-english-app/spec.md`: AC-039 lists the areas

## Expected Outcome

Steps, in order: daily lesson, streak and points, vocabulary, grammar, irregular verbs, review, exercise library, hard words, profile, settings, with the counter reading "1/10". The streak step uses the existing `streak` anchor on the home page; irregular verbs uses its nav item (on a phone it points at "Thêm", like grammar). The tour's behaviour (keyboard, More button, centred fallback) is unchanged.

## Quality Gates

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`
- `pnpm --filter learn-english e2e`

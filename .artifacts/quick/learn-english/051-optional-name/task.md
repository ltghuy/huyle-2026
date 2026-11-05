---
slug: optional-name
status: done
branch: main
created: 2026-11-05
---

# Quick Task: Don't ask for a name on the first visit

## What

Remove the first-visit "Bạn tên là gì?" dialog so a learner reaches the app without typing a name; the name stays optional in Settings.

## Files

- apps/learn-english/src/components/name/name-prompt.tsx (deleted) and its test (NameSetting tests kept)
- apps/learn-english/src/app/(app)/layout.tsx, apps/learn-english/src/app/(focus)/layout.tsx
- apps/learn-english/src/components/tour/app-tour.tsx (welcome dialog no longer waits for a name)
- apps/learn-english/src/components/settings/name-setting.tsx (empty field clears the name for guests too)
- apps/learn-english/e2e/helpers.ts and specs that called `enterName`
- .artifacts/features/learn-english/003-learner-name/spec.md (AC-001, AC-002, AC-005 retired)

## Expected Outcome

A fresh browser goes straight to the placement test with no name dialog. The welcome dialog says "Chào mừng bạn" when no name is stored. Every place that shows a name already falls back to the Google name, then "bạn" / "Học viên".

## Quality Gates

Run after the change, before marking done:

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test
- pnpm --filter learn-english build

---
slug: c1-irregular-verbs
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: Irregular verb forms for C1

## What

Add the forms of the three irregular C1 verbs (oversee, overdraw, shed) to the irregular verbs section of feature 008, and let the verbs page filter by C1.

## Files

- `.artifacts/features/learn-english/008-irregular-verbs/spec.md` (scope: C1 verbs are in, the count goes from 108 to 111)
- `apps/learn-english/src/components/verbs/verbs-browser.tsx` (C1 in the level filter)
- `apps/learn-english/src/components/verbs/verbs-browser.test.tsx`
- Content: `content/.drafts/manual/forms-C1.json` → `content/forms/C1.json` (owner review, IPA, audio, publish)

## Expected Outcome

The verbs page lists oversee (oversaw, overseen), overdraw (overdrew, overdrawn) and shed (shed, shed) under C1, each with IPA per form, a "base, past, participle" clip and two practice sentences, and the level filter has a C1 tab.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm -s content:draft import --check content/.drafts/manual/forms-C1.json` (in `apps/learn-english`)

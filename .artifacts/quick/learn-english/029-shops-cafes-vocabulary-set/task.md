---
slug: shops-cafes-vocabulary-set
status: done
branch: main
created: 2026-10-30
---

# Quick Task: Add small-shop and café words to the "Kinh doanh" (business) set

## What

Extend the business set with vocabulary for running a small shop, eatery or café, through the feature 012 content flow, within the 120-word cap (AC-015).

## Files

- apps/learn-english/content/set/set-business.json
- apps/learn-english/content/word/set-business.json
- apps/learn-english/content/sentence/set-business.json

## Expected Outcome

`set:business` holds 120 approved words, the 12 new ones with two B1 examples each and audio. Publishing to production waits for the owner.

## Quality Gates

Run after the change, before marking done:

- n/a (lint: content only, no code changed)
- n/a (typecheck: content only, no code changed)
- pnpm test

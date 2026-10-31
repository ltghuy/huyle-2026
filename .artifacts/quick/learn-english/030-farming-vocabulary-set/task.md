---
slug: farming-vocabulary-set
status: done
branch: main
created: 2026-10-31
---

# Quick Task: Add the "Chăn nuôi & trồng trọt" (livestock and crops) vocabulary set

## What

Add a new specialized vocabulary set, Chăn nuôi & trồng trọt (Livestock & Crops, B1), through the feature 012 content flow.

## Files

- apps/learn-english/content/set/set-farming.json
- apps/learn-english/content/word/set-farming.json
- apps/learn-english/content/sentence/set-farming.json

## Expected Outcome

The set is drafted with 90 to 120 words, every item passes `content:review approve set-farming --all --dry-run`, and a review sheet exists. Publishing waits for owner approval and audio.

## Quality Gates

Run after the change, before marking done:

- n/a (lint: content only, no code changed)
- n/a (typecheck: content only, no code changed)
- pnpm test

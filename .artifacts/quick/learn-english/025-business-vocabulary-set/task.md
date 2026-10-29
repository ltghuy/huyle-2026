---
slug: business-vocabulary-set
status: done
branch: main
created: 2026-10-29
---

# Quick Task: Add the "Kinh doanh" (business) vocabulary set

## What

Add a fourth specialized vocabulary set, Kinh doanh (Business, B1), through the feature 012 content flow.

## Files

- apps/learn-english/content/set/set-business.json
- apps/learn-english/content/word/set-business.json
- apps/learn-english/content/sentence/set-business.json

## Expected Outcome

The set is drafted with 90 to 120 words, every item passes `content:review approve set-business --all --dry-run`, and a review sheet exists. Publishing waits for owner approval and audio.

## Quality Gates

Run after the change, before marking done:

- n/a (lint: content only, no code changed)
- n/a (typecheck: content only, no code changed)
- pnpm test

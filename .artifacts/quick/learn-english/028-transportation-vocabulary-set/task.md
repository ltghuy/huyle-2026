---
slug: transportation-vocabulary-set
status: done
branch: main
created: 2026-10-30
---

# Quick Task: Add the "Giao thông" (transportation) vocabulary set

## What

Add a fifth specialized vocabulary set, Giao thông (Transportation, B1), through the feature 012 content flow.

## Files

- apps/learn-english/content/set/set-transportation.json
- apps/learn-english/content/word/set-transportation.json
- apps/learn-english/content/sentence/set-transportation.json

## Expected Outcome

The set is drafted with 90 to 120 words, every item passes `content:review approve set-transportation --all --dry-run`, and a review sheet exists. Publishing waits for owner approval and audio.

## Quality Gates

Run after the change, before marking done:

- n/a (lint: content only, no code changed)
- n/a (typecheck: content only, no code changed)
- pnpm test

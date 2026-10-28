---
slug: two-way-sync-e2e
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: Prove two-way sync end to end

## What

The owner wants sync to work both ways: words learned on either linked device show up on the other. Check that it does, and add an end-to-end test for the owner's back-and-forth scenario.

## Files

- `apps/learn-english/e2e/specs/sync.spec.ts`

## Expected Outcome

An e2e test where A learns words and turns sync on, B links and has them, B learns more and A picks them up after syncing, then A learns more and B picks that up. The test passes.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english e2e e2e/specs/sync.spec.ts --project=desktop`

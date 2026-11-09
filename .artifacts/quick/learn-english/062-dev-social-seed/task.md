---
slug: dev-social-seed
status: done
branch: main
created: 2026-11-09
---

# Quick Task: Seed sample friends into the local D1

## What

Add `pnpm db:seed:social` and `pnpm db:unseed:social`, which load and remove sample Arena friends, presence and a pending request in the local D1 only.

## Files

- apps/learn-english/scripts/fixtures/dev-social.sql
- apps/learn-english/scripts/fixtures/dev-social-clear.sql
- apps/learn-english/package.json, apps/learn-english/CLAUDE.md

## Expected Outcome

After seeding, a signed-in local account sees three friends (one online, one active 3 hours ago, one never seen) and one friend request in the bell. Unseeding leaves only the real accounts. Neither command can reach the remote database.

## Quality Gates

Run after the change, before marking done:

- seed twice, unseed, reseed: row counts match each time
- n/a lint, typecheck, test (SQL and package.json only)

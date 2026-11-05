---
slug: generate-cloudflare-types
status: done
branch: main
created: 2026-11-05
---

# Quick Task: Generate the Cloudflare types before build and typecheck

## What

Run `wrangler types` (the existing `cf:typegen`) at the start of the `build` and `typecheck` scripts, so a clean checkout has `cloudflare-env.d.ts`.

## Files

- apps/learn-english/package.json

## Expected Outcome

Workers Builds succeeds again. `cloudflare-env.d.ts` is gitignored, so the clean checkout Cloudflare builds from has no binding or Workers runtime types; since feature 023 the Arena code needs them (`ARENA_ROOM`, `ARENA_LIMITER`, `DurableObjectState`, `cloudflare:workers`) and Next's type check fails. A fresh clone with `pnpm install --frozen-lockfile && pnpm cf:english:build` must pass.

## Quality Gates

Run after the change, before marking done:

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test
- fresh clone: pnpm install --frozen-lockfile && pnpm cf:english:build

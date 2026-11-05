---
slug: generate-cloudflare-types
completed: 2026-11-05
---

# Summary: Generate the Cloudflare types before build and typecheck

## What Changed

Workers Builds had failed on every push since the Arena (feature 023). `cloudflare-env.d.ts`, the binding and Workers runtime types from `wrangler types`, is gitignored, so it existed only on machines where `pnpm cf:typegen` had been run. Next's build type-checks the app, and the Arena code needs `ARENA_ROOM`, `ARENA_LIMITER`, `DurableObjectState` and `cloudflare:workers` from that file, so the clean checkout failed with TS2339/TS2304 errors. `build` and `typecheck` now run `pnpm cf:typegen` first. OpenNext's Cloudflare build calls the app's `build` script, so Workers Builds gets the types too.

Verified in a fresh clone (`pnpm install --frozen-lockfile`, no `cloudflare-env.d.ts`): `pnpm cf:english:build` reproduced the failure before the change and completes after it; `pnpm --filter learn-english typecheck` passes. Local lint, typecheck and 1226 unit tests pass.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/package.json | `build` and `typecheck` start with `pnpm cf:typegen` |

## Patterns Discovered

A build that passes locally can depend on gitignored generated files. Reproduce CI with a fresh `git clone` and `pnpm install --frozen-lockfile` before trusting a local build.

## Follow-Up

`apps/web` and `apps/react-handbook` ignore the same file but don't use typed bindings, so their builds pass today. They would hit this the first time their code uses a binding type.

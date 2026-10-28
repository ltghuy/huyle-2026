---
slug: pnpm-catalog
completed: 2026-10-28
---

# Summary: One pnpm catalog for dependencies shared by the apps

## What Changed

`pnpm-workspace.yaml` now has a default `catalog` with the 28 dependencies that two or more workspace packages use, grouped by purpose. Each package lists them as `"catalog:"`. `catalogMode: prefer` makes `pnpm add` write `catalog:` for packages already in the catalog. Each entry takes the highest version that was already in use, so only `apps/web` resolves differently now: next and eslint-config-next 16.3.0 → 16.3.8, lucide-react 1.31 → 1.61, @opennextjs/cloudflare 1.20.2 → 1.20.10, wrangler 4.125 → 4.149. The lockfile shrank by about 1,500 lines because those duplicate copies are gone. Lint, typecheck, unit tests and build pass for all three apps.

## Files Modified

| File | Change |
|------|--------|
| `pnpm-workspace.yaml` | `catalog` and `catalogMode: prefer` |
| `apps/web/package.json`, `apps/react-handbook/package.json`, `apps/learn-english/package.json`, `packages/eslint-config/package.json` | Shared dependencies set to `catalog:` |
| `pnpm-lock.yaml` | Regenerated |
| `CLAUDE.md`, `.agents/knowledge.md` | How shared versions are kept in step |

## Patterns Discovered

A shared dependency gets its version from the catalog (recorded in knowledge.md, Decisions › repo).

## Follow-Up

Not run: e2e suites and Cloudflare preview. The bigger web upgrades (lucide-react 1.31 → 1.61, wrangler 4.125 → 4.149) passed typecheck and build, but only `pnpm cf:preview` would show a problem in the Workers build. `peerDependencies.eslint` in `packages/eslint-config` stays a plain `^9` range.

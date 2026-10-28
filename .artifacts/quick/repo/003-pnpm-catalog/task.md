---
slug: pnpm-catalog
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: One pnpm catalog for dependencies shared by the apps

## What

Add a default `catalog:` to `pnpm-workspace.yaml` for every dependency used by two or more workspace packages, and point those packages at it with `catalog:`.

## Files

- `pnpm-workspace.yaml`: `catalog` (and `catalogMode: prefer`)
- `apps/{web,react-handbook,learn-english}/package.json`, `packages/eslint-config/package.json`: shared entries become `catalog:`
- `pnpm-lock.yaml`
- `CLAUDE.md`, `.agents/knowledge.md`: say that shared versions live in the catalog

## Expected Outcome

Each shared dependency has one version range, set in the catalog. Each catalog entry takes the highest version already in use, so `apps/web` moves up to match the other apps: next 16.3.0 → 16.3.8, eslint-config-next 16.3.0 → 16.3.8, lucide-react 1.31 → 1.61, @opennextjs/cloudflare 1.20.2 → 1.20.10, wrangler 4.125 → 4.149. Nothing else resolves differently. Dependencies only one package uses stay in its own package.json.

## Quality Gates

Run after the change, before marking done:

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

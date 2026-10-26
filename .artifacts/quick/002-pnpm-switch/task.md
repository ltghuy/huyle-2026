---
slug: pnpm-switch
status: done
branch: main
created: 2026-10-26
---

# Quick Task: Switch the package manager from yarn 1 to pnpm

## What

Replace yarn 1 with pnpm 10, keeping the same resolved dependency versions. This is step 1 before the Turborepo move, done on the single-app layout so a breakage points at pnpm alone.

## Files

- package.json (`packageManager`)
- pnpm-workspace.yaml (new: approved build scripts)
- pnpm-lock.yaml (new, from `pnpm import`) / yarn.lock (removed)
- playwright.config.ts (`webServer.command`)
- .gitignore (drop yarn-only entries)
- CLAUDE.md, README.md, .agents/project.md (commands)

## Expected Outcome

- `pnpm install` works with a frozen lockfile and installs the same versions yarn did.
- Dependency build scripts that need to run (workerd, esbuild, sharp) are approved explicitly.
- No yarn references left in config or current docs (historical artifacts stay as written).

## Quality Gates

Run after the change, before marking done:

- pnpm install --frozen-lockfile
- pnpm lint
- pnpm tsc --noEmit -p .
- pnpm test
- pnpm build
- pnpm e2e
- pnpm preview (OpenNext Cloudflare build + local worker)

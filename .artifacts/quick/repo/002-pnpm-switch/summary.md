---
slug: pnpm-switch
completed: 2026-10-26
---

# Summary: Switch the package manager from yarn 1 to pnpm

## What Changed

Replaced yarn 1.22.22 with pnpm 10.34.9 (pinned through `packageManager`, run via corepack). `pnpm-lock.yaml` was generated with `pnpm import` from `yarn.lock`, so resolved versions are unchanged; `yarn.lock` is removed. pnpm 10 blocks dependency install scripts by default, so the four that need to run are approved in `pnpm-workspace.yaml`. Commands in the Playwright config and current docs now use pnpm. ESLint now ignores the OpenNext/wrangler build output, which had made `lint` fail after any Cloudflare build (a pre-existing issue, fixed so the lint gate could pass).

## Files Modified

| File | Change |
|------|--------|
| package.json | `packageManager: pnpm@10.34.9` |
| pnpm-workspace.yaml | New: `onlyBuiltDependencies` (esbuild, unrs-resolver, workerd) |
| pnpm-lock.yaml / yarn.lock | Added (from `pnpm import`) / removed |
| playwright.config.ts | `webServer.command: "pnpm dev"` |
| eslint.config.mjs | Ignore `.open-next/**` and `.wrangler/**` |
| .gitignore | Dropped yarn-only entries |
| CLAUDE.md, README.md, .agents/project.md | pnpm commands and stack line |

## Verification

`pnpm install --frozen-lockfile`, `pnpm lint`, `tsc --noEmit`, `pnpm test` (22/22), `pnpm build`, `pnpm e2e` (8/8) and `opennextjs-cloudflare build` + `preview` (`/`, `/robots.txt`, `/sitemap.xml`, `/opengraph-image` all 200) pass.

## Patterns Discovered

- A newly added dependency with a postinstall script is skipped silently apart from an install warning; add it to `onlyBuiltDependencies` if it needs to run.
- No undeclared (phantom) dependency imports existed, so pnpm's strict layout needed no extra hoisting config.

## Follow-Up

- If Cloudflare Workers Builds deploys from GitHub, confirm its install/build command uses pnpm after merge.
- Historical artifacts (`.artifacts/research/r3f-nextjs16-stack.md`, quick task 001) still mention yarn; left as written.
- Next: Turborepo move (spec-driven, Large).

---
topic: turborepo-pnpm-opennext-cloudflare
researched_at: 2026-10-26
version: "turbo 2.11.10 / @opennextjs/cloudflare 1.20.x / pnpm 10.34.9 / next 16.3.0"
sources_hash: "n/a"
ttl_days: 90
keywords:
  - turborepo
  - pnpm workspaces
  - opennext
  - cloudflare workers builds
  - monorepo
---

# Turborepo + pnpm workspaces + Next 16 on OpenNext/Cloudflare

> Researched: 2026-10-26

## Summary

All three pieces support a nested `apps/web` layout without special config: Next auto-detects the Turbopack root from the root `pnpm-lock.yaml`, and OpenNext detects the monorepo root and patches its output for it. The real traps are Turborepo's **strict env mode** (env vars not declared in `turbo.json` are hidden from tasks), pnpm **built-in commands shadowing scripts** (`deploy`), and **Cloudflare Workers Builds settings** that live outside the repo.

## Key Information

- **Turborepo 2.x `turbo.json`**: `$schema: "https://turborepo.dev/schema.json"`, top-level `tasks`; per task `dependsOn` (`^build` = upstream packages first), `outputs` (globs relative to the package; empty = only logs cached), `inputs` (default: all git-tracked files in the package), `cache` (default `true`), `persistent` (default `false`, for dev servers), `env`, `passThroughEnv`. Top-level `globalEnv`, `globalDependencies`. Root `package.json` and lockfile are always in the global hash. Docs moved to turborepo.dev.
- **`envMode` defaults to `"strict"`**: only vars in `env`/`globalEnv` (hashed) or `passThroughEnv` (not hashed) reach the task.
- **Next 16 Turbopack root**: auto-detected by looking for `pnpm-lock.yaml` / `package-lock.json` / `yarn.lock` / `bun.lock(b)`; `turbopack.root` only needed when not using workspaces (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopack.md:97-118`).
- **eslint-config-next `settings.next.rootDir`**: only needed when ESLint runs from a directory that is not the Next app (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md:146-155`).
- **`next dev` agent files**: writes/updates `AGENTS.md` (and creates `CLAUDE.md` = `@AGENTS.md` if neither exists) in the **Next project dir** (`node_modules/next/dist/server/lib/generate-agent-files.js:91-118`).
- **OpenNext Cloudflare monorepo**: `wrangler.jsonc`, `open-next.config.ts` and `.dev.vars` sit in the Next app's root. Build computes `monorepoRoot` vs `appPath` and writes a re-export `handler.mjs` when they differ (`node_modules/@opennextjs/cloudflare/dist/cli/build/bundle-server.js:156-158`); env files in the app dir take precedence over the monorepo root (`.../cli/utils/extract-project-env-vars.js:22-28`).
- **pnpm**: scripts are aliased as `pnpm <name>` only when the name is not a pnpm built-in. `deploy` is a built-in, so `pnpm deploy` never runs the script; `pnpm run deploy` does (pnpm.io/cli/run).
- **Workers Builds**: "root directory" = where `wrangler.jsonc` is and where build/deploy commands run; deploy command defaults to `npx wrangler deploy`; uses the wrangler version pinned in package.json; Turborepo example deploy command `turbo deploy -F <name>` (developers.cloudflare.com/workers/ci-cd/builds/advanced-setups).

## Implementation Notes

- Keep Workers Builds **root directory at `/`** and point its build/deploy commands at root scripts that delegate with `pnpm --filter`. Install then still happens at the repo root next to the lockfile (unchanged from today), and the dashboard never needs touching again when the app moves.
- Run deploy/preview **outside turbo** (`pnpm --filter web run …`): they are uncacheable, and strict env mode would strip `CLOUDFLARE_*` / `WORKERS_CI_*` vars.
- Declare `GOOGLE_SITE_VERIFICATION` in the build task's `env` so turbo passes it and hashes it.
- Root-anchored `.gitignore` patterns (`/.next/`, `/node_modules`) stop matching once the app is nested; unanchor them.
- Tailwind v4 only scans the app's own sources by default; a future shared UI package needs an `@source` directive in the app's CSS.

## Gotchas

- `pnpm deploy` silently runs pnpm's workspace-deploy command, not your script.
- Strict env mode hides undeclared env vars: `next build` would render without `GOOGLE_SITE_VERIFICATION` and still pass.
- UNVERIFIED: whether Workers Builds runs the install step in a subfolder root directory or at the repo root (docs silent). Avoided by keeping root directory `/`.

## Integration Constraints

- **CLI/SDK interface**: `opennextjs-cloudflare build | preview | deploy | upload` run from the app dir (needs `wrangler.jsonc` there); `turbo run <task> --filter=<pkg>`; `pnpm --filter <pkg> run <script>`.
- **Environment variables**: build: `GOOGLE_SITE_VERIFICATION` (optional); deploy (Workers Builds): Cloudflare-provided token/account vars.
- **Runtime constraints**: pnpm 10 must approve `esbuild`, `unrs-resolver`, `workerd` build scripts (`pnpm-workspace.yaml`).
- **Error modes**: undeclared env → silently missing in output; wrong Workers Builds commands → failed build, live site unaffected.

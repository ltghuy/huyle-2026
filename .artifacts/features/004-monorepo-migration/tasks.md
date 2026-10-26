---
id: 004
feature: monorepo-migration
created: 2026-10-26
---

# Tasks: Monorepo Migration

## Summary

Total: 12 | Completed: 1 | Remaining: 11

## Execution Plan

```
Phase A (old layout)                    Phase B (the move)
T001 --> T002 --> [owner: dashboard] --> T003 --> T004 --> T005 --┬--> T006 --┐
                                                                  └--> T007 --┼--> T008 --> T009 --> T010 --> T011 --> T012
                                                                              │
                                                                   (T006/T007 parallel)
```

Commit boundaries (each pushed to `main` only after its gates pass):

1. **A** — T001: `cf:*` scripts on the old layout. Then T002 (push + owner switches Workers Builds) is a checkpoint before anything moves.
2. **B1** — T003–T005: move into `apps/web`, workspace, turbo. The site builds and deploys from the new layout.
3. **B2** — T006–T008: shared config packages.
4. **B3** — T009–T010: agent notice + docs/rules.
5. **Close** — T011–T012: production check, knowledge/summary.

## Quality Gates

Run after each task or batch (root commands once T005 lands; before that, the existing scripts):

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck` (before T005: `pnpm exec tsc --noEmit -p .`)
- `pnpm test` (22/22)
- `pnpm build` (8 static routes)
- `pnpm e2e` (8/8)
- `pnpm cf:preview` → `/`, `/robots.txt`, `/sitemap.xml`, `/opengraph-image` = 200

## Tasks

### A — Stable Cloudflare script names (old layout)

- [x] T001 [P] Replace `preview`, `deploy`, `cf-typegen` in the root manifest with `cf:build` (OpenNext build), `cf:preview`, `cf:deploy`, `cf:deploy:prebuilt` (deploy without build), `cf:typegen`; update the README/CLAUDE.md command lists
  - **Done when:** `pnpm cf:build` then `pnpm cf:preview` serves the four probe routes with 200; `pnpm deploy` no longer appears in any doc. (`cf:deploy:prebuilt` is exercised for real in T002.)

- [ ] T002 [B:T001] Push commit A; owner sets Workers Builds → build command `pnpm cf:build`, deploy command `pnpm cf:deploy:prebuilt`, root directory `/`; trigger a deploy
  - **Done when:** the Workers Builds run for commit A succeeds with pnpm as installer, and the live site returns the expected `<title>` and 200 on the four probe routes. **Gate for Phase B — do not start T003 until this passes.**

### B1 — Move the site into the workspace

- [ ] T003 [B:T002] `git mv` the app (src, public, e2e, next/open-next/wrangler/postcss/vitest/playwright/tsconfig/eslint configs, vitest setup) into `apps/web/`; create `apps/web/package.json` (name `web`, current deps, scripts incl. `typecheck` and `cf:*`); move the untracked `.env` to `apps/web/.env`
  - **Done when:** `git status` shows renames (not delete+add) for every moved file; `apps/web` builds when run directly with `pnpm --dir apps/web build`.

- [ ] T004 [B:T003] Turn the root into the workspace root: `pnpm-workspace.yaml` gets `packages: [apps/*, packages/*]` (keep `onlyBuiltDependencies`); root manifest keeps only workspace-level fields; unanchor `.gitignore` build/dependency patterns and add `.turbo`; regenerate the lockfile
  - **Done when:** `pnpm install --frozen-lockfile` passes from a clean `node_modules`; `git status --ignored` shows `apps/web/.next`, `apps/web/.open-next`, `apps/web/node_modules` as ignored.

- [ ] T005 [B:T004] Add `turbo` at the root and `turbo.json` (cached `build` with `.next/**` minus cache and `env: [GOOGLE_SITE_VERIFICATION]`, cached `lint`/`typecheck`/`test`, uncached persistent `dev`, uncached `e2e`); root scripts `dev/build/lint/typecheck/test/e2e` → `turbo run`, `cf:*` → `pnpm --filter web run cf:*`
  - **Done when:** all Quality Gates pass from the root; a second `pnpm build` reports a full cache hit; `GOOGLE_SITE_VERIFICATION=x pnpm build` renders the verification meta tag; `git log --follow apps/web/src/app/layout.tsx` shows pre-move history.

### B2 — Shared configuration packages

- [ ] T006 [P] [B:T005] Create `packages/typescript-config` (`base.json`, `nextjs.json` holding today's compilerOptions); `apps/web/tsconfig.json` extends it, keeping `paths`, `include`, `exclude`, `plugins`
  - **Done when:** `pnpm typecheck` passes and `pnpm exec tsc --showConfig -p apps/web` shows the same compilerOptions as before the move.

- [ ] T007 [P] [B:T005] Create `packages/eslint-config` exporting today's flat config (Next vitals + TS + ignores incl. `.open-next/**`, `.wrangler/**`); `apps/web/eslint.config.mjs` re-exports it
  - **Done when:** `pnpm lint` passes with the same rule set (spot-check: a deliberate `<img>` in a scratch file still triggers `@next/next/no-img-element`, then removed).

- [ ] T008 [B:T006,T007] Prove a new app is picked up without editing root task definitions
  - **Done when:** a throwaway `apps/probe` with `build`/`lint`/`typecheck`/`test` echo scripts appears in `pnpm build --dry=json` task list; probe removed before commit; `turbo.json` unchanged.

### B3 — Agent notice, docs and rules

- [ ] T009 [B:T005] Move `AGENTS.md` to `apps/web/AGENTS.md`, add `apps/web/CLAUDE.md` (`@AGENTS.md`), point root `CLAUDE.md` at `@apps/web/AGENTS.md`
  - **Done when:** after `pnpm dev` starts and stops, `git status` is clean (Next reports the agent files unchanged).

- [ ] T010 [P] [B:T005] Update root `CLAUDE.md` (stack, layout, commands), `README.md`, `.agents/project.md`, and `.claude/rules/i18n-locale-content.md` (`paths:` globs and body → `apps/web/src/...`)
  - **Done when:** `grep -rn` for `` `src/`` and `yarn`/`pnpm deploy` across these four files finds no stale path or command; every path they cite exists.

### Close

- [ ] T011 [B:T008,T009,T010] Push B1–B3; watch the Workers Builds run with unchanged dashboard settings
  - **Done when:** production serves the same `<title>` and 200 on the four probe routes.

- [ ] T012 [B:T011] Record completion: mark verified ACs in spec.md, add any new gotchas to `.agents/knowledge.md`, update the session dump
  - **Done when:** every AC is `[x]` or has a recorded reason; spec status `to-review` (audit sets `done`).

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T004 |
| AC-002 | T005 |
| AC-003 | T005 |
| AC-004 | T003, T005 |
| AC-005 | T003, T005 |
| AC-006 | T005 |
| AC-007 | T003, T005 |
| AC-008 | T001, T005 |
| AC-009 | T001, T002, T005 |
| AC-010 | T001, T010 |
| AC-011 | T002, T011 |
| AC-012 | T006, T007 |
| AC-013 | T008 |
| AC-014 | T010 |
| AC-015 | T009 |

---
id: 005
feature: react-handbook-import
created: 2026-10-26
---

# Tasks: React Handbook Import

## Summary

Total: 16 | Completed: 12 | Remaining: 4

## Execution Plan

```
T001 (baseline, old repo)
  └--> T002 --> T003 --> T004 --┬--> T005 --┐
                                └--> T006 --┴--> T007 ==[commit B1]
                                                  └--> T008 --> T009 --┐
                                                       T010 -----------┼--> T011 --> T012 ==[commit B2]
                                                                       │
                                                  (T008/T009 and T010 parallel)
  [owner] T013 --> push --> [owner] T014 --> T015 --> T016
```

Commit boundaries (all local; pushed only with owner approval):

1. **B0** — T002–T003: the import merge (history only, not pushed on its own: the workspace isn't installable until B1).
2. **B1** — T004–T007: the handbook wired into the workspace; every gate green for both apps.
3. **B2** — T008–T012: `.artifacts` / `.agents` / `.claude` merged and docs updated.
4. **Rollout** — T013–T016: dashboard changes, push, watch-path proof, records.

## Quality Gates

Run from the root after each task or batch (from T007 on):

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (portfolio 22/22)
- `pnpm build` (both apps)
- `pnpm e2e` (portfolio 8/8 + handbook at its T001 baseline); then `git checkout -- apps/react-handbook/src/handbook/e2e/last-run.json apps/react-handbook/src/handbook/e2e/suite-files.json`
- `pnpm cf:preview` and `pnpm cf:handbook:preview` with route probes = 200

## Tasks

### Baseline

- [x] T001 [P] Record the handbook's pre-move baseline in the old repo (read-only): e2e pass count (`pnpm test:e2e`), `next build` route list, `curl -I` of `/practices` (redirect) and one `/api/*` + `/seo-lab/*` path (`X-Robots-Tag`), resolved dependency versions, and `tsc --showConfig`
  - **Done when:** the numbers and outputs are saved to the scratchpad and summarized in this task; the old repo's `git status` is unchanged afterwards.
  - **Baseline (2026-10-26, old repo HEAD `8dd264e`):** 83 commits, 1005 tracked files, clean tree. `next build` (Next 16.3.8) passes: 120 route lines (53 static, 10 SSG, 57 dynamic). e2e **34 passed** (specs + scenarios). Title `Frontend Handbook`. `/practices` → 308 `/react-practices`; `/practices/foo?step=2` → 308 `/react-practices/foo?step=2`. `/api/health` and `/seo-lab/server` send `X-Robots-Tag: noindex`; `/`, `/react-practices`, `/robots.txt`, `/sitemap.xml` = 200 without it. 562 resolved packages; `tsc --showConfig` 28 options / 719 files. Raw outputs in the session scratchpad (`005-baseline/`).

### B0 — Import with history

- [x] T002 [B:T001] Clone `react-practices` into the scratchpad (`git clone --no-local`), rewrite every commit with `git filter-branch --index-filter` so all paths sit under `apps/react-handbook/`
  - **Done when:** the rewritten branch has 83 commits, `git ls-tree -r --name-only HEAD` shows only `apps/react-handbook/…` paths, and the file count matches the original's 1005 tracked files.
  - **Result:** 83 commits, 1005 files, 0 outside the prefix; the rewritten `apps/react-handbook` tree hash equals the original HEAD tree (byte-identical content). Authors/dates kept; SHAs are new (old HEAD `8dd264e` → `e9e67fd`).

- [x] T003 [B:T002] Merge the rewritten branch into `main` with `--allow-unrelated-histories`
  - **Done when:** the merge has no conflicts; `git log --oneline -- apps/react-handbook/next.config.ts` lists pre-import commits; nothing outside `apps/react-handbook/` changed.
  - **Result:** merge `3a855c6`, no conflicts, 0 files outside the app; `next.config.ts` history reaches the handbook's first commit.

### B1 — Wire the handbook into the workspace

- [x] T004 [B:T003] Update the handbook manifest (name `react-handbook`; `dev` on 3001; `test:e2e` → `e2e`; `preview`/`deploy`/`cf-typegen` → `cf:*` plus `cf:build`, `cf:deploy:prebuilt`, `cf:upload:prebuilt`; drop `packageManager`); make its tsconfig extend `@repo/typescript-config/nextjs.json`; delete its `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `railway.json`
  - **Done when:** `tsc --showConfig` for the handbook matches the T001 output; `git status` shows the three deletions and no stray `tsconfig.tsbuildinfo`.
  - **Result / deviation:** `test:e2e` is **kept** (the handbook's own pages tell readers to run `pnpm test:e2e`, and changing site content is out of scope); an `e2e` script forwards to it for turbo. `tsc --showConfig`: compilerOptions identical; file set differs only by `.next/dev/types/*` generated in the old repo.

- [x] T005 [B:T004] Merge workspace settings (`ignoredBuiltDependencies: [sharp]`), install, and diff the handbook's resolved versions against T001; pin any runtime dependency that moved beyond a patch
  - **Done when:** `pnpm install --frozen-lockfile` passes; the version diff is recorded here with every non-patch change pinned or justified.
  - **Result:** fresh resolution changed 90/573 packages. Direct deps re-pinned in the lockfile to their old versions (`@base-ui/react` 1.8.0, `lucide-react` 1.52.0, `shadcn` 4.21.3, `zod` 4.6.5, `postcss` 8.5.29, `@opennextjs/cloudflare` 1.20.10, `wrangler` 4.149.0) with manifest ranges unchanged. 86 transitive packages still differ (mostly AWS SDK internals of OpenNext; `typescript-eslint` 8.66 vs 8.71); all gates pass with them.
  - **Deviation 1 — one `@types/react` for the workspace (19.2.18):** pnpm publicly hoists `*types*`, so two versions made the portfolio type-check against the hoisted 19.3.0 while R3F augments 19.2.18 → portfolio typecheck/build broke (`'group' does not exist on JSX.IntrinsicElements`). The handbook now locks 19.2.18 (range still `^19`).
  - **Deviation 2 — one Playwright for the workspace (1.64.1):** playwright-bdd requires `playwright` without declaring it, so it got the hoisted portfolio copy (1.62.1) while the runner was 1.64.1; two scenarios failed with `bddTestData not found` (only in full-suite runs). Portfolio `@playwright/test` raised to `^1.64.1`; this is the revisit condition named in decisions.md.

- [x] T006 [P] [B:T004] Add `passThroughEnv: ["CI"]` to turbo `e2e`; add root `cf:handbook:{build,preview,deploy,deploy:prebuilt,upload:prebuilt,typegen}` forwarders
  - **Done when:** `pnpm exec turbo run e2e --dry=json` lists both apps' `e2e` tasks; every `cf:handbook:*` script resolves to the handbook's matching script.
  - **Result:** build/lint/typecheck/e2e/dev each list both apps (`test` only the portfolio); all six `cf:handbook:*` resolve.

- [x] T007 [B:T005,T006] Run every Quality Gate for both apps and the parity checks against T001 (routes, `/practices` redirect, `X-Robots-Tag` headers, e2e count, `git log` history); commit **B0+B1** (merge commit, then wiring commit)
  - **Done when:** all gates pass; parity matches T001; the reporter JSON files are restored; two local commits exist, not pushed.
  - **Result:** frozen install; lint 2/2; typecheck 2/2; portfolio 22/22 unit; build 2/2 with handbook routes identical (120 lines) and portfolio 8 routes; repeat build FULL TURBO; e2e portfolio 8/8 + handbook **34/34**; handbook `next start` redirects/`X-Robots-Tag`/title identical to T001; both `cf:*build` + workerd previews serve their probes (handbook 308 + noindex intact); root `pnpm dev` serves 3000 + 3001.

### B2 — Merge `.artifacts`, `.agents`, `.claude`

- [x] T008 [B:T007] Regroup `.artifacts`: `features/{web,repo,react-handbook}/`, `quick/{web,repo,react-handbook}/` per the design mapping; move `research/ai-search.md`; drop the handbook's `.gitkeep` files
  - **Done when:** `features/react-handbook` has 48 entries, `quick/react-handbook` 26, `features/web` 1, `features/repo` 2, `quick/web` 1, `quick/repo` 1; nothing of `.artifacts` is left under `apps/react-handbook/`; all moves are renames.
  - **Result:** counts exactly as listed; all 257 handbook artifact files (old repo count without `.gitkeep`) present, including 9 more research notes than the design listed (`build-toolchains`, `bundlers`, `css-pipeline`, `micro-frontends`, `monorepo-tooling`, `react-internals`, `seo-at-scale`, `seo-fundamentals`, `transpilers`; no name clashes). All moves are renames.

- [x] T009 [B:T008] Merge the handbook's `knowledge.md` into `.agents/knowledge.md` (`### repo` / `### web` / `### react-handbook` under each section); move its baseline to `.agents/baselines/react-handbook/`
  - **Done when:** the merged file's bullet count per section equals the two sources' combined counts; no `.agents` left under the app.
  - **Result:** Decisions 10+45=55, Gotchas 22+112=134, Codebase Feedback 3+17=20. Portfolio entries split into `repo` (workspace/tooling/deploy, plus the AGENTS.md note shared by both apps) and `web`. One handbook entry (deploy via Worker `react-practices`, `pnpm preview`/`pnpm deploy`) got a dated *Superseded* sub-bullet instead of a rewrite.

- [x] T010 [P] [B:T007] Move rules to `.claude/rules/web/` and `.claude/rules/react-handbook/`; give each a `paths:` frontmatter (`apps/web/src/**`, `apps/react-handbook/**`); replace the ignored `appliesTo`; make paths inside the handbook rules repo-relative
  - **Done when:** every file under `.claude/rules/` starts with a `paths:` frontmatter; no `appliesTo` remains; every path a rule cites exists; nothing of `.claude` is left under the app.
  - **Result:** rules 02–05 scoped to `apps/react-handbook/**`; 01 (spec-driven) and 06 (writing) also to `.artifacts/{features,quick}/react-handbook/**` and `.agents/baselines/react-handbook/**`, so they load when handbook specs are edited. Portfolio rule now uses `paths:` (same globs). Rule 01 rewritten for the per-group layout.

- [x] T011 [B:T008,T009,T010] Update references to moved artifact paths (`.artifacts/features/00x-…`, `.artifacts/quick/00x-…`) across specs, knowledge and instructions
  - **Done when:** a grep for old flat artifact paths finds none outside historical text that names the old repo.
  - **Result:** 33 files rewritten (`.artifacts/{features,quick}/NNN-…` → `…/react-handbook/NNN-…`, baseline path, `.claude/rules/0N-…` → `.claude/rules/react-handbook/0N-…`); every rewritten reference resolves. Kept as-is: 005's own from→to mapping table and 004's description of the then-current rule path.

- [x] T012 [B:T011] Update root `CLAUDE.md` (both apps, commands, artifact groups + numbering rule), `README.md` (both apps, both deploys and their watch paths), `.agents/project.md`, and the handbook's `CLAUDE.md`/`README.md` (root commands, rule location, app-relative paths in its old specs); run the gates; commit **B2**
  - **Done when:** gates pass; every path cited in these files exists; one local commit, not pushed.
  - **Result:** root CLAUDE.md (two apps, root/filtered commands, `cf:handbook:*`, artifact groups + per-group numbering, rules layout), root README (both apps, both Workers Builds settings tables), `.agents/project.md`, handbook CLAUDE.md/README (monorepo context, port 3001, `cf:*` names, Railway removed). All cited paths exist; lint/typecheck/build 2/2.

### Rollout (owner + push)

- [ ] T013 [B:T012] Owner sets the portfolio Worker's watch paths (include `apps/web/*, packages/*, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, turbo.json`); owner approves the push; push B0–B2
  - **Done when:** the portfolio's Workers Builds run for the push is green and its log shows `Executing user build command: pnpm cf:build`; huyle.work probes return 200 with the same title.

- [ ] T014 [B:T013] Owner connects the `react-handbook` Worker's Workers Builds to `ltghuy/huyle-2026` (root `/`, build `pnpm cf:handbook:build`, deploy `pnpm cf:handbook:deploy:prebuilt`, version `pnpm cf:handbook:upload:prebuilt`, include `apps/react-handbook/*` + the shared list) and runs a build
  - **Done when:** the log shows `Executing user build command: pnpm cf:handbook:build` and the deploy succeeds; learn.huyle.work returns the T001 title, the `/practices` redirect and 200 on its probe routes.

- [ ] T015 [B:T014] Prove the watch paths: one trivial handbook-only commit and one trivial portfolio-only commit (owner-approved pushes)
  - **Done when:** each push produces exactly one Workers Builds run, on the matching Worker.

- [ ] T016 [B:T015] Record completion: mark ACs in spec.md, add new gotchas to `.agents/knowledge.md`, update the session dump; spec status `to-review`
  - **Done when:** every AC is `[x]` or has a recorded reason.

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T005 |
| AC-002 | T004, T007 |
| AC-003 | T004, T006, T007 |
| AC-004 | T004, T007 |
| AC-005 | T001, T007, T014 |
| AC-006 | T002, T003 |
| AC-007 | T006, T007 |
| AC-008 | T014, T015 |
| AC-009 | T013, T015 |
| AC-010 | T013, T014 |
| AC-011 | T006, T012 |
| AC-012 | T008 |
| AC-013 | T012 |
| AC-014 | T009 |
| AC-015 | T010 |
| AC-016 | T012 |
| AC-017 | T004, T012 |

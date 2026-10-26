@apps/web/AGENTS.md

# Project: evan-le

A Turborepo monorepo (pnpm workspaces) with two Next.js 16 (App Router) apps:
the portfolio in `apps/web` (huyle.work) and the Frontend Handbook in
`apps/react-handbook` (learn.huyle.work). The handbook has its own
`apps/react-handbook/CLAUDE.md` (stack, required skills), which loads when you
work on its files.

## Layout

- `apps/web` — the portfolio (package `web`); its Next/OpenNext/wrangler/test configs live here
- `apps/react-handbook` — the handbook (package `react-handbook`), same per-app layout
- `packages/typescript-config` — shared tsconfig presets (`@repo/typescript-config`)
- `packages/eslint-config` — shared ESLint flat config (`@repo/eslint-config`)
- `turbo.json` — task pipeline; `pnpm-workspace.yaml` — workspace members

## Stack (portfolio; see the handbook's CLAUDE.md for its stack)

- **Framework:** Next.js 16.3 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Linting:** ESLint (eslint-config-next, via `@repo/eslint-config`)
- **Package manager:** pnpm (workspaces)
- **Monorepo:** Turborepo
- **Import alias:** `@/*` -> `apps/web/src/*` (app-local; shared packages import by package name)

## Commands

Run from the repo root. `dev/build/lint/typecheck/test/e2e` go through turbo for
every app (cached except `dev`/`e2e`); `start`, `test:watch` and `cf:*` forward to
`apps/web`, `cf:handbook:*` to `apps/react-handbook`. Target one app with
`pnpm --filter <web|react-handbook> <script>`.

- `pnpm dev` — start both dev servers (portfolio :3000, handbook :3001)
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — run ESLint
- `pnpm typecheck` — run `tsc --noEmit`
- `pnpm test` / `pnpm e2e` — unit (Vitest) / end-to-end (Playwright) tests
- `pnpm --filter <app> add <pkg>` — add a dependency to one app. Keep `@types/react`
  and `@playwright/test` on one version across apps (see `.agents/knowledge.md`).
- `pnpm cf:preview` — build for Cloudflare and serve it locally
- `pnpm cf:deploy` — build for Cloudflare and deploy (never `pnpm deploy`: that is a pnpm built-in)
- `pnpm cf:build` + `pnpm cf:deploy:prebuilt` — the split build/deploy steps Workers Builds runs
  (`pnpm cf:upload:prebuilt` is its version command for non-production branches)
- `pnpm cf:handbook:{build,preview,deploy,deploy:prebuilt,upload:prebuilt,typegen}` — the same for the handbook

## Development Workflow: Spec-Driven Development (SDD)

This project follows the **spec-driven** standard. Do NOT jump straight to code
for non-trivial work. Instead:

1. **Specify** — capture WHAT to build (`.artifacts/features/{group}/{ID}-{name}/spec.md`)
2. **Design** — capture HOW, for Large/Complex features (`design.md`)
3. **Tasks** — ordered breakdown, for Large/Complex features (`tasks.md`)
4. **Implement** — build incrementally, verifying after each task/range
5. **Verify** — check adherence + correctness, mark acceptance criteria
6. **Audit** — validate goals & success criteria, then mark the feature done

Depth auto-sizes by scope: small changes use quick-mode, medium features skip
design/tasks, large/complex features run the full pipeline. Invoke the workflow
with the `spec-driven` skill (or `/spec-driven`).

### Artifact locations

Specs and quick tasks are grouped by app. Pick the group by what the change touches:

| Group | For | Example |
|-------|-----|---------|
| `web` | only `apps/web` | `.artifacts/features/web/001-portfolio` |
| `react-handbook` | only `apps/react-handbook` | `.artifacts/features/react-handbook/048-home-hub-links` |
| `learn-english` | only `apps/learn-english` (planned) | `.artifacts/features/learn-english/001-learn-english-app` |
| `repo` | both apps, shared packages, workspace, tooling, deploy | `.artifacts/features/repo/005-react-handbook-import` |

- `.artifacts/features/{group}/{ID}-{name}/` — feature specs, designs, tasks
- `.artifacts/quick/{group}/{NNN}-{slug}/` — quick-mode tasks
- **Numbering:** IDs are per group: next ID = highest ID in that group + 1, never reused.
- `.artifacts/research/` — reusable research cache, shared by all groups
- `.agents/project.md` — project context (this project)
- `.agents/knowledge.md` — cross-feature decisions & gotchas; each section has `### repo`, `### web`, `### react-handbook`
- `.agents/baselines/{group}/` — baselines of pre-existing behavior
- `.claude/rules/{web,react-handbook}/` — agent rules, each scoped to its app with `paths:` frontmatter (the only key Claude Code reads)

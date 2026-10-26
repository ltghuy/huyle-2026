@apps/web/AGENTS.md

# Project: evan-le

A Turborepo monorepo (pnpm workspaces). The site is a Next.js 16 (App Router)
app in `apps/web`, built with TypeScript and Tailwind CSS.

## Layout

- `apps/web` — the site (package `web`); its Next/OpenNext/wrangler/test configs live here
- `packages/typescript-config` — shared tsconfig presets (`@repo/typescript-config`)
- `packages/eslint-config` — shared ESLint flat config (`@repo/eslint-config`)
- `turbo.json` — task pipeline; `pnpm-workspace.yaml` — workspace members

## Stack

- **Framework:** Next.js 16.3 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Linting:** ESLint (eslint-config-next, via `@repo/eslint-config`)
- **Package manager:** pnpm (workspaces)
- **Monorepo:** Turborepo
- **Import alias:** `@/*` -> `apps/web/src/*` (app-local; shared packages import by package name)

## Commands

Run from the repo root. `dev/build/lint/typecheck/test/e2e` go through turbo
(cached except `dev`/`e2e`); the rest forward to `apps/web`.

- `pnpm dev` — start the dev server (Turbopack)
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — run ESLint
- `pnpm typecheck` — run `tsc --noEmit`
- `pnpm test` / `pnpm e2e` — unit (Vitest) / end-to-end (Playwright) tests
- `pnpm --filter web add <pkg>` — add a dependency to the site
- `pnpm cf:preview` — build for Cloudflare and serve it locally
- `pnpm cf:deploy` — build for Cloudflare and deploy (never `pnpm deploy`: that is a pnpm built-in)
- `pnpm cf:build` + `pnpm cf:deploy:prebuilt` — the split build/deploy steps Workers Builds runs

## Development Workflow: Spec-Driven Development (SDD)

This project follows the **spec-driven** standard. Do NOT jump straight to code
for non-trivial work. Instead:

1. **Specify** — capture WHAT to build (`.artifacts/features/{ID}-{name}/spec.md`)
2. **Design** — capture HOW, for Large/Complex features (`design.md`)
3. **Tasks** — ordered breakdown, for Large/Complex features (`tasks.md`)
4. **Implement** — build incrementally, verifying after each task/range
5. **Verify** — check adherence + correctness, mark acceptance criteria
6. **Audit** — validate goals & success criteria, then mark the feature done

Depth auto-sizes by scope: small changes use quick-mode, medium features skip
design/tasks, large/complex features run the full pipeline. Invoke the workflow
with the `spec-driven` skill (or `/spec-driven`).

### Artifact locations

- `.artifacts/features/` — feature specs, designs, tasks
- `.artifacts/quick/` — quick-mode tasks
- `.artifacts/research/` — reusable research cache
- `.agents/project.md` — project context (this project)
- `.agents/knowledge.md` — cross-feature decisions & gotchas (created as needed)

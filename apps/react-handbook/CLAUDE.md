@AGENTS.md

# react-handbook (`apps/react-handbook`)

The Frontend Handbook (learn.huyle.work), one app of the monorepo.
Fullstack Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 +
shadcn/ui (base-nova) + Zod. Package manager: pnpm (workspace root).

Commands (in this folder, or from the root with `pnpm --filter react-handbook …`):
`pnpm dev` (port 3001) · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test:e2e`

Specs live at the repo root in `.artifacts/features/react-handbook/` and
`.artifacts/quick/react-handbook/`; knowledge in `.agents/knowledge.md` under
`### react-handbook`. Paths inside older specs are relative to this folder.

## Required skills

| When | Skill |
|------|-------|
| Any feature, change, or fix (spec first, keep code ↔ spec in sync) | `spec-driven` |
| Writing or reviewing any React/Next.js UI (primary UI skill) | `vercel-react-best-practices` |
| Creating a new page or redesigning one | `ui-ux-pro-max` |
| Writing or rewriting any content (page text, UI copy, docs, specs, commits, PRs) | `humanizer:humanizer` |

Detailed rules live in `.claude/rules/react-handbook/` at the repo root (loaded
automatically for handbook files only):
- `01-spec-driven-workflow.md`: SDD flow, artifact locations, sync rules
- `02-ui-implementation.md`: shadcn/ui usage, RSC boundaries
- `03-new-page-design.md`: new page workflow
- `04-architecture.md`: FE/BE layering and API conventions
- `05-event-handlers.md`: inline JSX handlers only for one-line calls; extract the rest
- `06-writing-content.md`: run every piece of prose through the humanizer skill

@AGENTS.md

# learn-english (`apps/learn-english`)

Learn English (english.huyle.work): an English course for Vietnamese speakers,
one app of the monorepo. Next.js 16 (App Router) + React 19 + TypeScript +
Tailwind v4 + shadcn/ui (base-nova). The UI is in Vietnamese; only the English
being taught appears in English. No accounts and no AI at runtime: learner
progress lives in the browser (IndexedDB), and a small API over Cloudflare D1
serves content, sync codes and anonymous stats.

Commands (in this folder, or from the root with `pnpm --filter learn-english …`):
`pnpm dev` (port 3002) · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` ·
`pnpm e2e` (Cloudflare preview on port 3102) · `pnpm cf:preview` · `pnpm cf:typegen`

Specs live at the repo root in `.artifacts/features/learn-english/` (feature
001 is the app itself: spec, decisions, design, tasks); knowledge in
`.agents/knowledge.md` under `### learn-english`.

## Required skills

| When | Skill |
|------|-------|
| Any feature, change, or fix (spec first, keep code ↔ spec in sync) | `spec-driven` |
| Writing or reviewing any React/Next.js UI | `vercel-react-best-practices` |
| Creating a new page or redesigning one | `ui-ux-pro-max` |
| Writing or rewriting English prose (docs, specs, commits, PRs) | `humanizer:humanizer` |

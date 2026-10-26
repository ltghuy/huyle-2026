# Frontend Handbook

A hands-on handbook for frontend engineering. Each page explains a topic and
backs it with a live demo, often talking to a real API route in the same app.
Live at [learn.huyle.work](https://learn.huyle.work).

## Sections

| Section | Path | Pages |
|---------|------|-------|
| React Practices | `/react-practices` | 14 classic UI problems built from scratch: toasts, searchable accordion, infinite scroll, data-fetching hook with caching, real-time chat, file upload with progress, virtualized lists, accessible modal, Context + `useReducer`, multi-step form, lazy images, debounced search, data grid, large-dataset performance |
| Browser & Web Platform | `/browser-platform` | Networking, Origins/DNS/CORS, how the browser renders a page |
| Performance & Accessibility | `/performance-accessibility` | Performance (Core Web Vitals, code splitting, long tasks), Accessibility |
| Security | `/security` | JSON Web Tokens, XSS/CSP/CSRF |
| Frontend System Design | `/system-design` | The design method, design a news feed, design an autocomplete, design a frontend monorepo, design micro frontends |
| Under the Hood | `/under-the-hood` | From source to bundle (build pipeline, toolchains, dev vs prod, content hashes), Transpiling (a live in-browser TS/JSX compiler, type stripping, JSX runtimes, targets, source maps), Bundlers (a working in-browser bundler: resolution, module graph, runtime, tree shaking, code splitting, dev servers and HMR), The CSS pipeline (CSS delivery and FOUC in a real frame, a Sass stand-in, real PostCSS and Tailwind running in the browser, CSS Modules), Inside React (real element objects, the fiber tree, reconciliation and keys from real DOM mutations, render/commit order, urgent vs deferred updates) |
| Testing | `/testing` | Testing strategy (what a test buys, levels and shapes, choosing the level, test doubles, where checks run), End-to-end testing with Playwright (the repo's own suite, locators, waiting, page objects, CI), Behaviour-driven tests with Cucumber (the repo's feature files as living documentation, steps, a scenario checker), A/B testing (a live experiment on the page, sample size, peeking, sample ratio checks) |
| SEO | `/seo` | How search works (the crawl, render, index and serve pipeline, how pages are found, what a crawler reads, duplicate URLs, ranking and Search Console numbers), Crawling and indexing control (the site's own robots.txt, sitemap, canonical URLs and robots rules, a robots.txt tester, a sitemap audit, status codes), JavaScript and rendering SEO (lab pages comparing server HTML with the rendered page, rendering strategies, a metadata check of every route, links and soft 404s, content behind interaction), Metadata and structured data (the site's Open Graph and X cards, generated card images and JSON-LD, a result preview, a share preview, a JSON-LD checker and editor), SEO for AI search and LLMs (the site's AI crawler rules and llms.txt, a robots.txt tester for AI bots, a model of how AI answers cite pages, controls per vendor, an llms.txt checker, an access log check), SEO at scale (an hreflang checker, a redirect map check with the site's own redirects, faceted navigation, cases of generated pages, and the site's SEO checks in the end-to-end suite) |

The section and page list lives in `src/practices/catalog.ts`.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (`base-nova` style, Base UI primitives) + `lucide-react`
- Zod for input validation and env parsing
- pnpm

## Getting started

This app lives in `apps/react-handbook` of the
[huyle-2026](https://github.com/ltghuy/huyle-2026) monorepo (Turborepo + pnpm
workspaces) next to the portfolio site. Install once at the repo root:

```bash
pnpm install
cp apps/react-handbook/.env.example apps/react-handbook/.env.local
pnpm --filter react-handbook dev
```

Open [http://localhost:3001](http://localhost:3001). Root `pnpm dev`, `pnpm build`,
`pnpm lint`, `pnpm typecheck` and `pnpm e2e` run both apps through Turborepo.
The commands below run inside `apps/react-handbook`, or from the root with
`pnpm --filter react-handbook <command>`.

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Dev server on port 3001 |
| `pnpm build` / `pnpm start` | Production build and Node server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm test:e2e` | Generate tests from the Gherkin features, build, serve on port 3100 and run the Playwright suite in `e2e/` (`pnpm e2e` is the same, for the root task) |
| `pnpm cf:preview` | Build for Cloudflare and run locally on workerd (root: `pnpm cf:handbook:preview`) |
| `pnpm cf:deploy` | Build and deploy to Cloudflare Workers (root: `pnpm cf:handbook:deploy`) |
| `pnpm cf:build` / `pnpm cf:deploy:prebuilt` / `pnpm cf:upload:prebuilt` | Split build, deploy and version-upload steps that Workers Builds runs |
| `pnpm cf:typegen` | Generate Cloudflare binding types |

### End-to-end tests

The Playwright suite in `e2e/` tests five practice pages through page objects: specs in `e2e/specs/`, and Gherkin scenarios in `e2e/features/` with their steps in `e2e/steps/`, which playwright-bdd turns into tests (`bddgen`). Install the browser once, then run it:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

Each run also rewrites `src/handbook/e2e/last-run.json` and `suite-files.json`, which the
"End-to-end testing with Playwright" page shows. Commit them with the change that ran them.

## Project layout

```
src/
├── app/
│   ├── (playground)/        pages, one route per practice/topic
│   └── api/                 route handlers (thin: parse → service → respond)
│       ├── practices/       backends for the React practices
│       ├── handbook/        backends for the handbook demos (CORS, cache, JWT, CSP, …)
│       └── health/          health check
├── practices/{slug}/        React practice components + catalog.ts
├── handbook/{topic}/        handbook topic content and demos
├── components/              playground shell + shadcn/ui primitives (ui/)
├── server/                  server-only services, Zod schemas, env.ts
├── hooks/
└── lib/                     client/server-safe helpers (http.ts, utils.ts)
```

## How this repo is built

Development is spec-first. Every feature has a spec under
`.artifacts/features/react-handbook/{ID}-{name}/` (at the repo root), small
changes are recorded under `.artifacts/quick/react-handbook/`, and cross-feature
decisions and gotchas live in `.agents/knowledge.md` (`react-handbook`
subsections). Agent rules are in this app's `CLAUDE.md` and `AGENTS.md` and in
`.claude/rules/react-handbook/`, which apply only to handbook files. Paths
inside older specs are relative to this app.

Minimum quality gate before a change is done:

```bash
pnpm typecheck && pnpm lint && pnpm build
```

### Agent skills

The rules in `.claude/rules/react-handbook/` tell Claude Code to load four skills. Install
them before you work on the repo with an agent, or the rules will point at
skills that don't exist.

| Skill | Used for | Rule |
|-------|----------|------|
| `spec-driven` | Every feature, change or fix: spec first, then code | `01-spec-driven-workflow.md` |
| `vercel-react-best-practices` | Writing or reviewing React and Next.js UI | `02-ui-implementation.md` |
| `ui-ux-pro-max` | Designing a new page or redesigning one | `03-new-page-design.md` |
| `humanizer:humanizer` | Any prose: page text, UI copy, docs, specs, commits, PRs | `06-writing-content.md` |

`spec-driven` and `vercel-react-best-practices` come from the
[Skills CLI](https://skills.sh). `-g` installs them for every project:

```bash
npx skills add adeonir/agent-skills --skill spec-driven -g
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices -g
```

`ui-ux-pro-max` has its own CLI. It runs Python scripts, so Python 3 must be
on your `PATH`:

```bash
npm install -g ui-ux-pro-max-cli
uipro init --ai claude --global
```

`humanizer` is a Claude Code plugin. Run these inside Claude Code (it needs
version 2.1.142 or newer):

```text
/plugin marketplace add blader/humanizer
/plugin install humanizer@humanizer
```

On an older Claude Code, use
`npx skills add blader/humanizer --global --agent claude-code` instead. The
skill is then named `humanizer` without the plugin prefix.

Start a new Claude Code session afterwards so it picks up the new skills.

## Deployment

Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare):
config in `wrangler.jsonc` (Worker `react-handbook`) and `open-next.config.ts`,
routed to the custom domain `learn.huyle.work`.

- **Automatic:** Cloudflare Workers Builds deploys pushes to `main` of the
  monorepo. Settings: root directory `/`, build command `pnpm cf:handbook:build`,
  deploy command `pnpm cf:handbook:deploy:prebuilt`, version command
  `pnpm cf:handbook:upload:prebuilt`, include paths
  `apps/react-handbook/*, packages/*, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, turbo.json`.
- **Manual:** `pnpm cf:handbook:deploy` from the repo root (needs `wrangler login`).

Some demos keep state in memory (`globalThis`), so on Workers that state is
per-isolate and cross-request logs can be inconsistent.

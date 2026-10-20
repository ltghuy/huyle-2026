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
| Frontend System Design | `/system-design` | The design method, design a news feed, design an autocomplete, design a frontend monorepo |
| Under the Hood | `/under-the-hood` | From source to bundle (build pipeline, toolchains, dev vs prod, content hashes), Transpiling (a live in-browser TS/JSX compiler, type stripping, JSX runtimes, targets, source maps), Bundlers (a working in-browser bundler: resolution, module graph, runtime, tree shaking, code splitting, dev servers and HMR), The CSS pipeline (CSS delivery and FOUC in a real frame, a Sass stand-in, real PostCSS and Tailwind running in the browser, CSS Modules), Inside React (real element objects, the fiber tree, reconciliation and keys from real DOM mutations, render/commit order, urgent vs deferred updates) |

The section and page list lives in `src/practices/catalog.ts`.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (`base-nova` style, Base UI primitives) + `lucide-react`
- Zod for input validation and env parsing
- pnpm

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build and Node server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm preview` | Build for Cloudflare and run locally on workerd |
| `pnpm run deploy` | Build and deploy to Cloudflare Workers |
| `pnpm cf-typegen` | Generate Cloudflare binding types |

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
`.artifacts/features/{ID}-{name}/`, small changes are recorded under
`.artifacts/quick/`, and cross-feature decisions and gotchas live in
`.agents/knowledge.md`. Agent rules are in `CLAUDE.md`, `AGENTS.md` and
`.claude/rules/`.

Minimum quality gate before a change is done:

```bash
pnpm typecheck && pnpm lint && pnpm build
```

## Deployment

- Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare):
  config in `wrangler.jsonc` and `open-next.config.ts`, routed to the custom
  domain `learn.huyle.work`. The first deploy needs `wrangler login`.
- Railway: `railway.json` builds with `pnpm build` and runs `pnpm start` as
  a single Node instance.

Some demos keep state in memory (`globalThis`), so on Workers that state is
per-isolate and cross-request logs can be inconsistent. A single Node instance
doesn't have that problem.

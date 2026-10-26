# Huy Le — Portfolio & Frontend Handbook

Two sites by **Le Tran Gia Huy (Huy Le)**, a software engineer focused on
AI-native web development, in one Turborepo monorepo on pnpm workspaces:

| App | Folder | Live |
|-----|--------|------|
| Portfolio | `apps/web` | **[huyle.work](https://huyle.work)** |
| Frontend Handbook | `apps/react-handbook` | **[learn.huyle.work](https://learn.huyle.work)** (see [its README](apps/react-handbook/README.md)) |

The rest of this README covers the portfolio and the workspace.

Built with Next.js 16 (App Router, Turbopack), React 19, TypeScript, and Tailwind
CSS v4, with WebGL/Three.js visuals and GSAP-driven motion.

## Stack

- **Framework:** Next.js 16.3 (App Router, RSC, Streaming, Turbopack)
- **UI:** React 19, Tailwind CSS v4
- **3D / motion:** Three.js, `@react-three/fiber`, `@react-three/drei`, GSAP
- **Language:** TypeScript
- **Testing:** Vitest + Testing Library (unit), Playwright (e2e)
- **Linting:** ESLint (`eslint-config-next`)
- **Package manager:** pnpm (workspaces)
- **Monorepo:** Turborepo
- **Import alias:** `@/*` → `apps/web/src/*`

## Getting Started

Install dependencies once at the repo root, then run the development server:

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts both apps: the portfolio on
[http://localhost:3000](http://localhost:3000) and the handbook on
[http://localhost:3001](http://localhost:3001). Use `pnpm --filter web dev` for
the portfolio alone.

## Scripts

Run from the repo root. `dev`, `build`, `lint`, `typecheck`, `test` and `e2e` run
for every app; target one with `pnpm --filter <web|react-handbook> <script>`.

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |
| `pnpm test` | Run unit tests once (Vitest) |
| `pnpm test:watch` | Run unit tests in watch mode |
| `pnpm e2e` | Run end-to-end tests (Playwright) |
| `pnpm cf:preview` | Build for Cloudflare and serve it locally in the Workers runtime |
| `pnpm cf:deploy` | Build for Cloudflare and deploy |
| `pnpm cf:build` / `pnpm cf:deploy:prebuilt` | Build and deploy as separate steps (Cloudflare Workers Builds uses these) |
| `pnpm cf:upload:prebuilt` | Upload a built version without promoting it (Workers Builds, non-production branches) |
| `pnpm cf:typegen` | Generate types for the Cloudflare `env` bindings |
| `pnpm cf:handbook:*` | The same Cloudflare commands for the handbook (`build`, `preview`, `deploy`, `deploy:prebuilt`, `upload:prebuilt`, `typegen`) |

`build`, `lint`, `typecheck` and `test` are cached by Turborepo; a repeat run with
no changes replays the previous result. Never use `pnpm deploy`: it is a pnpm
built-in, not the deploy script.

## Project Structure

```
apps/
├── react-handbook/       # the Frontend Handbook (package `react-handbook`)
└── web/                  # the portfolio (package `web`)
    ├── src/
    │   ├── app/          # App Router entry, layout, SEO (sitemap, robots, OG images)
    │   ├── components/   # UI components grouped by area
    │   │   ├── hero/     #   editorial hero + scroll-driven portrait
    │   │   ├── intro/    #   intro overlay
    │   │   ├── sections/ #   About, Work, Experience, Gallery, Contact
    │   │   ├── motion/   #   reusable motion primitives (reveal, scramble, magnetic)
    │   │   ├── layout/   #   nav, footer, smooth scroll, skip link
    │   │   ├── icons/    #   brand icons
    │   │   └── three/    #   shared WebGL pieces
    │   ├── content/      # Site content (profile, projects, experience, skills, gallery)
    │   └── lib/          # Hooks, i18n & utilities
    ├── public/           # Static assets, llms.txt
    └── e2e/              # Playwright specs
packages/
├── typescript-config/    # shared tsconfig presets
└── eslint-config/        # shared ESLint flat config
turbo.json                # task pipeline
```

Site content lives in `apps/web/src/content/` — edit `profile.ts`, `projects.ts`,
`experience.ts`, `skills.ts`, `gallery.ts`, and `socials.ts` to update the page
without touching component code.

## Deployment

Both apps deploy to Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare),
each as its own Worker with its own Workers Builds project connected to this repo.
Build watch paths make a push rebuild only the app it touches; changes to shared
packages or root workspace files rebuild both.

| Setting | Portfolio (Worker `huyle-2026`) | Handbook (Worker `react-handbook`) |
|---------|------------------------------|------------------------------------|
| Root directory | `/` | `/` |
| Build command | `pnpm cf:build` | `pnpm cf:handbook:build` |
| Deploy command | `pnpm cf:deploy:prebuilt` | `pnpm cf:handbook:deploy:prebuilt` |
| Version command | `pnpm cf:upload:prebuilt` | `pnpm cf:handbook:upload:prebuilt` |
| Include paths | `apps/web/*, packages/*, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, turbo.json` | `apps/react-handbook/*, packages/*, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, turbo.json` |
| Exclude paths | `node_modules/**, .git/` | `node_modules/**, .git/` |
| Manual deploy | `pnpm cf:deploy` | `pnpm cf:handbook:deploy` |

Never use `pnpm deploy`: it is a pnpm built-in, not a deploy script.

The canonical production URL is defined once in `apps/web/src/content/profile.ts`
(`profile.url`) and drives SEO metadata, `robots.txt`, and the sitemap.

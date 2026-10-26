# Huy Le — Portfolio

The personal portfolio of **Le Tran Gia Huy (Huy Le)**, a software engineer focused
on AI-native web development. Live at **[huyle.work](https://huyle.work)**.

Built with Next.js 16 (App Router, Turbopack), React 19, TypeScript, and Tailwind
CSS v4, with WebGL/Three.js visuals and GSAP-driven motion. The repo is a
Turborepo monorepo on pnpm workspaces; the site lives in `apps/web`.

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

Open [http://localhost:3000](http://localhost:3000) to view the site. The page
auto-updates as you edit files.

## Scripts

Run from the repo root.

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
| `pnpm cf:typegen` | Generate types for the Cloudflare `env` bindings |

`build`, `lint`, `typecheck` and `test` are cached by Turborepo; a repeat run with
no changes replays the previous result. Never use `pnpm deploy`: it is a pnpm
built-in, not the deploy script.

## Project Structure

```
apps/
└── web/                  # the site (package `web`)
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

Deployed to Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare)
(Worker `huyle-2026`, config in `apps/web/wrangler.jsonc`).

- **Automatic:** Cloudflare Workers Builds deploys every push to `main`. Its
  settings: root directory `/`, build command `pnpm cf:build`, deploy command
  `pnpm cf:deploy:prebuilt`.
- **Manual:** `pnpm cf:deploy` from the repo root.

The canonical production URL is defined once in `apps/web/src/content/profile.ts`
(`profile.url`) and drives SEO metadata, `robots.txt`, and the sitemap.

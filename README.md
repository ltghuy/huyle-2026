# Huy Le — Portfolio

The personal portfolio of **Le Tran Gia Huy (Huy Le)**, a software engineer focused
on AI-native web development. Live at **[huyle.work](https://huyle.work)**.

Built with Next.js 16 (App Router, Turbopack), React 19, TypeScript, and Tailwind
CSS v4, with WebGL/Three.js visuals and GSAP-driven motion.

## Stack

- **Framework:** Next.js 16.3 (App Router, RSC, Streaming, Turbopack)
- **UI:** React 19, Tailwind CSS v4
- **3D / motion:** Three.js, `@react-three/fiber`, `@react-three/drei`, GSAP
- **Language:** TypeScript
- **Testing:** Vitest + Testing Library (unit), Playwright (e2e)
- **Linting:** ESLint (`eslint-config-next`)
- **Package manager:** Yarn
- **Import alias:** `@/*` → `src/*`

## Getting Started

Run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site. The page
auto-updates as you edit files.

## Scripts

| Command | Description |
| --- | --- |
| `yarn dev` | Start the dev server (Turbopack) |
| `yarn build` | Production build |
| `yarn start` | Serve the production build |
| `yarn lint` | Run ESLint |
| `yarn test` | Run unit tests once (Vitest) |
| `yarn test:watch` | Run unit tests in watch mode |
| `yarn e2e` | Run end-to-end tests (Playwright) |

## Project Structure

```
src/
├── app/           # App Router entry, layout, SEO (sitemap, robots, OG images)
├── components/     # UI components grouped by area
│   ├── hero/       #   editorial hero + scroll-driven portrait
│   ├── intro/      #   intro overlay / vortex
│   ├── sections/   #   About, Work, Experience, Gallery, Contact
│   ├── motion/     #   reusable motion primitives (reveal, scramble, magnetic)
│   ├── layout/     #   nav, footer, smooth scroll, skip link
│   └── social/     #   social links + brand icons
├── content/        # Site content (profile, projects, experience, skills, gallery)
└── lib/            # Hooks & utilities (viewport, media query, WebGL, reduced motion)
public/             # Static assets, llms.txt
```

Site content lives in `src/content/` — edit `profile.ts`, `projects.ts`,
`experience.ts`, `skills.ts`, `gallery.ts`, and `socials.ts` to update the page
without touching component code.

## Deployment

Deployed on [Vercel](https://vercel.com). The canonical production URL is defined
once in `src/content/profile.ts` (`profile.url`) and drives SEO metadata,
`robots.txt`, and the sitemap.

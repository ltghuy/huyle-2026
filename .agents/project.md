# Project Context: evan-le

## Overview

A Next.js 16 web application scaffolded on 2026-08-10. Purpose is not yet
defined — the project was set up as a clean foundation, with the first feature
to be specified later via the spec-driven workflow.

## Technical Foundation

| Aspect | Choice |
|--------|--------|
| Framework | Next.js 16.3 (App Router) |
| Bundler | Turbopack |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Linting | ESLint (`eslint-config-next`) |
| Package manager | pnpm (v10, workspaces) |
| Monorepo | Turborepo (`turbo.json`) |
| Deploy | Cloudflare Workers via OpenNext |
| Source root | `apps/web/src/` |
| Import alias | `@/*` → `apps/web/src/*` |

## Structure

```
apps/web/             # the site (package `web`)
  src/
    app/
      layout.tsx      # Root layout
      page.tsx        # Home page
      globals.css     # Tailwind entry + global styles
  public/             # Static assets
packages/
  typescript-config/  # @repo/typescript-config
  eslint-config/      # @repo/eslint-config
turbo.json            # task pipeline
```

## Conventions

- Development follows **Spec-Driven Development** — see `CLAUDE.md`.
- New features get a spec under `.artifacts/features/` before implementation.
- Prefer App Router server components; add `"use client"` only when needed.

## Open Items

- [ ] Define the product/purpose and write the first feature spec.

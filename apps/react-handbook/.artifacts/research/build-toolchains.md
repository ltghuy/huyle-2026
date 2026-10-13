---
topic: build-toolchains
researched_at: 2026-10-13
version: "CRA 5 (react-scripts 5) / Vite 8.3 / Next.js 16.3"
sources_hash: "n/a"
ttl_days: 90
keywords:
  - webpack
  - vite
  - rolldown
  - oxc
  - turbopack
  - swc
  - create-react-app
---

# Build toolchains: which tool does which job

> Researched: 2026-10-13

## Summary

Create React App was sunset on 2025-02-14 (react.dev blog "Sunsetting Create
React App"); it is webpack 5 + Babel. Vite 8 (stable 2026-03-12) replaced the
esbuild + Rollup pair with Rolldown (bundler) and Oxc (transform/minify), and
still serves source as unbundled native ESM in dev. Next.js 16 uses Turbopack
(default for dev and build; `--webpack` opts out) with SWC for transforms;
`next build` runs `tsc` type checking in parallel.

## Key Information

| Job | CRA 5 dev | CRA 5 prod | Vite 8 dev | Vite 8 prod | Next 16 dev | Next 16 prod |
|-----|-----------|------------|------------|-------------|-------------|--------------|
| Resolve / graph | webpack 5 | webpack 5 | Vite dev server, per request (bare imports rewritten to pre-bundled deps) | Rolldown | Turbopack (lazy, only requested routes) | Turbopack |
| TS/JSX transform | Babel (babel-preset-react-app) | Babel | Oxc | Oxc | SWC | SWC |
| Type-check | fork-ts-checker-webpack-plugin (overlay) | same, fails the build | none (IDE) | none in Vite; template script runs `tsc -b` before `vite build` | none (IDE / `tsc --watch`) | `tsc` in parallel with compilation (skip: `typescript.ignoreBuildErrors`) |
| CSS | css-loader + postcss-loader (+ sass-loader), injected by style-loader | extracted by mini-css-extract-plugin | built-in CSS + PostCSS/Sass if configured, injected via JS with HMR | extracted .css | Lightning CSS (CSS Modules, nesting) + PostCSS if configured | same, extracted |
| Bundle | webpack, in memory (webpack-dev-server) | webpack to build/ | source NOT bundled; deps pre-bundled by Rolldown | Rolldown | Turbopack, bundles in dev | Turbopack to .next/ |
| Minify | none | Terser (JS), css-minimizer (cssnano) | none | Oxc (JS, `build.minify: 'oxc'`), Lightning CSS (`build.cssMinify`) | none | SWC minifier (JS) |
| Dev server | webpack-dev-server | — (static files) | Vite | — (static files) | `next dev` | `next start` Node server (also renders on server) |
| Hot update | webpack HMR + React Fast Refresh | — | Vite HMR over WebSocket + React Refresh (plugin-react v6 uses Oxc) | — | Fast Refresh (Turbopack HMR) | — |

## Implementation Notes

- Bundlers interleave resolve and transform: each module is loaded, transformed, parsed for imports, and those imports resolved, recursively. The automatic JSX runtime adds an import (`react/jsx-runtime`) that only exists after transform.
- Real tools hash with xxhash64/md4 etc.; a demo using SHA-256 truncated is a faithful model of content hashing, not the same digest.

## Gotchas

- Next.js docs say Turbopack's CSS Modules/nesting run on Lightning CSS; CSS minifier for Next prod not stated explicitly in bundled docs — don't claim one.
- "Vite type-checks" is a common misconception; Vite only strips types.

Sources: https://react.dev/blog/2025/02/14/sunsetting-create-react-app · https://vite.dev/blog/announcing-vite8 · https://vite.dev/config/build-options · https://vite.dev/guide/dep-pre-bundling · node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md · node_modules/next/dist/docs/01-app/02-guides/building.md · node_modules/next/dist/docs/01-app/03-api-reference/05-config/02-typescript.md

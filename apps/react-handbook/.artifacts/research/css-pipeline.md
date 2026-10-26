---
topic: css-pipeline
researched_at: 2026-10-13
version: "PostCSS 8.5.29 / Tailwind 4.3.3 / Dart Sass 1.93.2 / Next 16 / Vite 8"
sources_hash: "n/a"
ttl_days: 90
keywords:
  - postcss
  - tailwind
  - sass
  - css-modules
  - lightningcss
  - fouc
---

# The CSS pipeline

> Researched: 2026-10-13

## Summary

Dev servers inject CSS from JS (hot-swappable, can flash unstyled); production
extracts render-blocking stylesheets. Sass is build-time only. PostCSS is a
parser + plugin runner; Lightning CSS does parse/prefix/nest/minify in Rust
(Next 16: CSS Modules and nesting; Vite 8: minify, transforms still PostCSS by
default). CSS Modules rename classes per file. Tailwind v4 scans files as text
for candidates and generates only valid utilities, with theme variables.

## Key Information

- Tailwind v4 `compile()` is pure JS (dist/lib.mjs, 250 kB / 63 kB gz, no imports) and runs in the browser; `build(candidates)` ignores invalid ones; non-reference theme import emits only used variables.
- PostCSS has a `browser` field disabling fs/path/source-map; ~30 kB gz.
- Dart Sass expanded style: no blank lines between rules; nested @media bubbles; colors are evaluated (rgb()/8-digit hex → rgba).

Sources: https://postcss.org/docs/writing-a-postcss-plugin · https://tailwindcss.com/docs/detecting-classes-in-source-files · https://sass-lang.com/documentation/ · https://github.com/css-modules/css-modules · https://lightningcss.dev/ · https://vite.dev/config/build-options · node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md

---
id: 029
feature: css-pipeline
created: 2026-10-13
---

# Technical Design: The CSS pipeline

## Scope

Page `/under-the-hood/css-pipeline`, five topics. Real tools loaded on demand
in the browser: PostCSS 8.5.29 (new direct dependency) and Tailwind 4.3.3
(moved to dependencies, since client code now imports it). Hand-built: a SCSS
subset compiler (verified against Dart Sass 1.93.2 in the scratchpad), CSS
Modules scoping as a PostCSS plugin, three teaching PostCSS plugins.

## Research Summary

- Delivery: dev servers inject CSS from JS (style-loader, Vite) so it can hot-update; production extracts `.css` files linked in `<head>`, which block rendering until loaded, so the first paint is styled. A `<style>` inserted after content has painted causes a flash of unstyled content (FOUC).
- PostCSS: parses CSS to an AST (Root, Rule, AtRule, Declaration, Comment) with source offsets; plugins are `{ postcssPlugin, Once/Rule/Declaration… }` visitors; it parses nested rules natively.
- Tailwind v4 `compile(css, { loadStylesheet })` → `build(candidates)` returns CSS for valid candidates only; invalid ones are ignored. Candidates come from scanning files as plain text (Oxide, native) — strings must appear whole in source.
- CSS Modules: each local class/id/keyframes name becomes unique (hash of file + name), the module exports the mapping; `:global(...)` opts out; `composes` adds class names.
- Sass: variables, nesting with `&` (incl. suffixes), nested `@media` bubbles up wrapping the parent selector, `@mixin`/`@include` with arguments and defaults; `//` comments dropped, `/* */` kept.

## Decisions

| Decision | Rationale |
|---|---|
| Lazy-load PostCSS and Tailwind with `import()` inside the demos | Keeps them out of the page's initial JS (practising what the previous page teaches); ~30 kB and ~63 kB gzipped |
| Tailwind theme text generated into `tailwind-theme.ts` from `node_modules/tailwindcss/theme.css` | Turbopack has no raw-text import; the generator header names the source and version |
| Real-browser frames are sandboxed `srcdoc` iframes (`sandbox="allow-scripts"`), reading Paint Timing inside and posting results out | Precedent: knowledge feature:017/019/020 (srcdoc iframes, postMessage, Paint Timing in iframes) |
| FOUC model: simulated bundle delay 900 ms, labelled | Network is not needed to show the ordering; the paint timing is real |
| Sass stand-in: recursive parser of the SCSS subset → flat rules; unsupported directives (`@use`, `@extend`, `@if`, `@each`, maths) error by name | Teachable size; verified per sample vs Dart Sass |
| CSS Modules naming `[file]_[local]__[hash5]`, hash = SHA-256 of `path:local` (base64url) | Readable; real content hash; labelled as one common scheme |
| Prefixer data: a small table (user-select, backdrop-filter, appearance, text-size-adjust, mask-image, line-clamp), labelled | Autoprefixer + Can I Use is the real source |
| PostCSS AST → tree view via adapter to `{ type, start, end }` nodes using `source.start.offset`/`source.end.offset` | Reuses `AstTree` and `SourceView` from 027 |

## Component Design

| Component | File |
|---|---|
| route + catalog + content | app route, catalog.ts, src/handbook/css-pipeline/content.tsx |
| DeliveryDemo | delivery-demo.tsx (srcdoc page + timing report) |
| sass compiler | sass/compile.ts |
| SassDemo | sass-demo.tsx |
| PostCSS plugins + adapter | postcss-tools.ts |
| PostcssDemo | postcss-demo.tsx |
| CSS Modules plugin + demo | css-modules.ts, modules-demo.tsx |
| Tailwind runner + scanner + demo | tailwind.ts, tailwind-theme.ts (generated), tailwind-demo.tsx |
| Shared lazy loader hook | use-tool.ts |

## Requirements Traceability

| Requirement | Component |
|---|---|
| AC-001..002 | DeliveryDemo |
| AC-003..005 | PostcssDemo, postcss-tools.ts |
| AC-006..007 | SassDemo, sass/compile.ts |
| AC-008..009 | ModulesDemo, css-modules.ts |
| AC-010..011 | TailwindDemo, tailwind.ts |

## Test Strategy

Scratch: Sass stand-in vs Dart Sass on all samples (+ extra cases); PostCSS plugins and CSS Modules in node with the same postcss; Tailwind runner in node. Browser: Puppeteer per AC, FOUC timings, axe light/dark, 360 px, keyboard.

## Considerations

- The frames run only page-authored markup plus the reader's CSS/markup in a sandbox without `allow-same-origin`; nothing reaches the parent except posted timing numbers.

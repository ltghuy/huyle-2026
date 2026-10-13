---
topic: bundlers
researched_at: 2026-10-13
version: "webpack 5 / Vite 8 / Turbopack (Next 16) / Node 22"
sources_hash: "n/a"
ttl_days: 90
keywords:
  - module-resolution
  - exports-conditions
  - tree-shaking
  - sideEffects
  - code-splitting
  - hmr
---

# Bundlers: resolution, runtime, tree shaking, splitting, HMR

> Researched: 2026-10-13

## Summary

Resolution follows Node's package rules (exports map with conditions in key
order, patterns; main fields as bundler fallback). ES module evaluation is a
post-order DFS over static imports; cycles hit TDZ errors for const/let.
Tree shaking keeps top-level side effects unless `sideEffects: false` or
`/*#__PURE__*/`. Dynamic `import()` creates chunks; shared modules are split or
duplicated. HMR propagates to accepting boundaries or reloads.

## Key Information

- Verified locally: Node 22 native ESM run of the shop sample logs format → cart → analytics → main; the a↔b cycle throws `ReferenceError: Cannot access 'a' before initialization` after "b: running".
- webpack runtime: `__webpack_require__`, `__webpack_require__.d` (getter exports), chunk loading via JSONP/`import()`; production scope hoisting (ModuleConcatenationPlugin), Rollup/Rolldown/esbuild hoist by default.
- `sideEffects` may be an array of globs (e.g. `["*.css"]`).
- Vite: source served as native ESM, deps pre-bundled by Rolldown (Vite 8); Turbopack: lazy, incremental, function-level cache, bundles in dev.

Sources: https://nodejs.org/api/packages.html#package-entry-points · https://webpack.js.org/guides/tree-shaking/ · https://webpack.js.org/concepts/manifest/ · https://vite.dev/guide/dep-pre-bundling · https://vite.dev/guide/api-hmr · node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md

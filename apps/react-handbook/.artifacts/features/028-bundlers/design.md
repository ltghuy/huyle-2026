---
id: 028
feature: bundlers
created: 2026-10-13
---

# Technical Design: Bundlers

## Scope

In: page `/under-the-hood/bundlers`, five topics, a small in-browser bundler
(`src/handbook/bundlers/bundler/`) built on the 027 compiler: virtual file
system, resolver, graph, linker + runtime, tree shaker, chunker, HMR
propagation; and a dev-server work model. Out: CSS/assets (029), real tools.

## Research Summary

- Node/bundler resolution: relative specifiers try the path, then extensions, then `index.*`; bare specifiers find `node_modules/<pkg>/package.json`; if it has `exports`, only exported subpaths resolve (else error "Package subpath … is not defined by exports"); conditional objects are matched in **key order** against the active conditions (always incl. `default`); subpath patterns `./x/*`. Without `exports`, bundlers use `browser`/`module`/`main` fields (mainFields).
- ESM evaluation: post-order depth-first over static imports in source order; each module evaluates once; cycles evaluate the dependency first, so reading a `const`/`let` export of a module still mid-evaluation throws `ReferenceError: Cannot access 'x' before initialization`.
- webpack `sideEffects: false` (package.json) lets the bundler skip a module none of whose exports are used, even for re-exports; `/*#__PURE__*/` marks a call removable if its result is unused.
- Vite/webpack HMR: an update propagates from the edited module to its importers until every path reaches a module that accepts it (React Fast Refresh boundaries: modules exporting only components); reaching a module with no importers means a full reload.
- Dev-server designs: webpack bundles everything before serving; Vite serves source as native ESM transformed on request (one request per module) with dependencies pre-bundled; Turbopack bundles lazily per requested route with function-level caching (bundled Next 16 docs).

## Patterns & Reuse

| Pattern / Code | Location | Use |
|---|---|---|
| `compile()` (TS/JSX → JS AST + code) | src/handbook/transpiling/compiler | parse each module; reuse `generate()` for module bodies |
| `CodePanel`, `useSize`, `sizes.ts` | src/handbook/build-pipeline | code + real sizes |
| `SourceView` | src/handbook/transpiling/source-view.tsx | — |
| `Choice`, `Toggle`, Tabs, Textarea | existing | controls |
| Topic page shape | src/handbook/transpiling/content.tsx | content |

## Data Model

| Entity | Shape |
|---|---|
| `Project` | `Record<path, string>` virtual files (incl. `node_modules/*/package.json`) |
| `ResolveStep` | `{ tried, outcome: "missing" \| "found" \| "field" \| "condition" \| "error", detail }` |
| `Resolution` | `{ ok, path?, error?, steps }` |
| `ModuleRecord` | `{ path, imports: { specifier, kind: static\|dynamic\|sideEffect, names[], resolved?, error? }[], exports: string[], reexports, program (JS AST), sideEffects: boolean, error? }` |
| `Graph` | `{ entry, modules: Map, order (post-order), cycles: path[][], errors }` |
| `Chunk` | `{ id, modules: path[], kind: entry\|lazy\|shared, loadedBy }` |
| `RunEvent` | `{ kind: "evaluate"\|"cache"\|"log"\|"fetch"\|"loaded"\|"error", text, at }` |

## Decisions

| Decision | Rationale |
|---|---|
| Linker rewrites the JS AST: imports → `const _m = __require(id)`; imported names → `_m.name` (shorthand props expanded); exports → `__export(exports, { name: () => name })` getters hoisted to the top; `import()` → `__require.chunk(id).then(() => __require(path))` | Same shape as webpack's runtime; getters give live bindings and real TDZ errors in cycles |
| Shadowing of imported names by local variables is not handled | Documented limitation of the simplified bundler; samples avoid it |
| Execution: `new Function` with a captured console, a host object for chunk loading (`setTimeout` latency) and an evaluation-step budget (event count cap) | Real execution; bounded logs; no network |
| Tree shaking at statement level: kept = side-effectful statements + declarations of used exports + their transitive local references; module dropped if no used exports and (no side effects or package `sideEffects: false`) | Mirrors Rollup/webpack behavior at a teachable granularity |
| Side effect = top-level expression statement, or a declaration whose initializer contains a call/new not preceded by `/*#__PURE__*/` in the source | Pure annotation read from source text before the call's offset (the compiler drops comments) |
| Chunks: entry chunk = static closure of entry; each dynamic import target = lazy chunk of its static closure minus the entry chunk; modules in ≥2 lazy chunks → shared chunk when splitting is on, else duplicated | Equivalent to webpack's default splitChunks for async chunks, simplified |
| Dev-server comparison as a labelled work model (counts, not milliseconds) | Honest; numbers follow from each design |
| Native ESM order check: scratch script writes the compiled modules as .mjs and runs them in Node, comparing logs with the bundle run | Proves AC/Success "matches native ESM order" |

## Component Design

| Component | File | Responsibility |
|---|---|---|
| projects | src/handbook/bundlers/projects.ts | sample projects (shop, circular, icons library, split routes) |
| resolve | bundler/resolve.ts | resolution with trace |
| graph | bundler/graph.ts | parse, collect imports/exports, BFS, post-order, cycles |
| link | bundler/link.ts | AST rewrite + bundle/chunk text |
| runtime | bundler/runtime.ts | runtime prelude text + `runBundle` |
| treeshake | bundler/treeshake.ts | used exports, kept statements, report |
| chunks | bundler/chunks.ts | chunk assignment |
| hmr | bundler/hmr.ts | propagation |
| FileEditor | src/handbook/bundlers/file-editor.tsx | tabs of editable virtual files + reset |
| ResolveDemo / GraphDemo | resolve-demo.tsx, graph-demo.tsx | topic 01 |
| RuntimeDemo | runtime-demo.tsx | topic 02 |
| TreeShakeDemo | treeshake-demo.tsx | topic 03 |
| SplitDemo | split-demo.tsx | topic 04 |
| DevServerDemo / HmrDemo | devserver-demo.tsx, hmr-demo.tsx | topic 05 |
| content + route + catalog | content.tsx, app route, catalog | page |

## Requirements Traceability

| Requirement | Component |
|---|---|
| AC-001..003 | resolve.ts, ResolveDemo |
| AC-004..005 | graph.ts, GraphDemo, FileEditor |
| AC-006..008 | link.ts, runtime.ts, RuntimeDemo |
| AC-009..011 | treeshake.ts, TreeShakeDemo |
| AC-012..014 | chunks.ts, SplitDemo |
| AC-015..016 | DevServerDemo, hmr.ts, HmrDemo |

## Test Strategy

Scratch node scripts (bundler compiled with `tsc --module commonjs`): resolver cases (conditions, patterns, missing subpath, extensions, index); graph cycles; bundle run log vs Node native ESM run of the same modules; tree-shake outcomes for each toggle; chunk sets with/without splitting; HMR paths. Browser: Puppeteer per AC, axe light/dark, 360 px, keyboard.

## Considerations

- Execution safety: only the reader's own edits to sample files run, in their own tab (like a REPL); a runaway loop is bounded by a step budget injected into the runtime's require/log, plus try/catch.

---
topic: transpilers
researched_at: 2026-10-13
version: "TypeScript 5.9.3 / Babel 7.29.9 / Node 22.18+"
sources_hash: "n/a"
ttl_days: 90
keywords:
  - typescript
  - babel
  - jsx
  - type-stripping
  - isolatedModules
  - erasableSyntaxOnly
  - source-maps
---

# Transpilers: TypeScript and JSX to JavaScript

> Researched: 2026-10-13 (outputs generated locally with the installed tools)

## Summary

Per-file transpilers (Babel, SWC, Oxc, esbuild, `ts.transpileModule`) remove
types without checking them; only a TypeScript program (`tsc`) type-checks.
Constructs that need generated code (enum, namespace with values, parameter
properties) are not "erasable": TS 5.8+ `erasableSyntaxOnly` reports TS1294,
and Node.js (type stripping on by default since 22.18.0 / 23.6.0) rejects them
without `--experimental-transform-types`.

## Key Information

- `transpileModule` + `isolatedModules`: `const enum` compiles like a normal enum (no cross-file inlining). Babel 7.29.9 does the same.
- `export { User } from "./types"` where User is a type: TS1205 under isolatedModules; TS and Babel both keep the export → runtime "does not provide an export named".
- Babel compiles enums (IIFE with `/*#__PURE__*/`), namespaces and parameter properties; TS emits class field declarations (`x; y;`) plus assignments for parameter properties at ESNext.
- Type errors never block per-file emit: `shout(42)` emits unchanged; tsc reports TS2345.
- JSX automatic (`jsx: react-jsx`): `import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime"`; key is the 3rd argument; several children → `_jsxs` with an array. Classic (`jsx: react`): `React.createElement(type, props | null, ...children)`.
- TS lowering inlines helpers (`__awaiter`, `__classPrivateFieldGet`) unless `importHelpers`; built-ins (`Array.prototype.at`, `structuredClone`) are left unchanged at every target — polyfills (core-js) are a separate concern.

## Gotchas

- A diagnostics program over a file with no import/export treats it as a global script: namespaces then also raise TS1280. Filter it out or add `export {}`.

Sources: https://nodejs.org/api/typescript.html · https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly · https://www.typescriptlang.org/tsconfig/#isolatedModules · https://legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html · https://tc39.es/ecma426/ (source map spec)

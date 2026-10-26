---
id: 027
feature: transpiling
created: 2026-10-13
---

# Technical Design: Transpiling: TypeScript and JSX to JavaScript

## Scope

In: page `/under-the-hood/transpiling` (catalog `written: true`, own route
folder, which takes over from the `[slug]` fallback), five topics, a hand-built
in-browser compiler for a TS/JSX subset, and data generated from real tools.
Out: type checking, plugins, enums/namespaces in the live compiler (topic 02
covers them with real outputs).

## Research Summary

> From .artifacts/research/transpilers.md (written with this design)

- TypeScript 5.9.3 `transpileModule` (per-file, like Babel/SWC/Oxc) is the reference: `jsx: react-jsx` emits `import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime"`, `_jsx(type, props, key?)`; `jsx: react` emits `React.createElement(type, props|null, ...children)`.
- Non-erasable constructs (enum, const enum, namespace with values, parameter properties) fail `erasableSyntaxOnly` with TS1294; Node 22.18+/23.6+ strips types by default and rejects them without `--experimental-transform-types`.
- Under `isolatedModules`, `transpileModule` and Babel 7.29 compile `const enum` like a normal enum (no inlining); `export { User } from "./types"` of a type is TS1205 and both tools keep it, so it fails at runtime.
- Type errors don't block emit: `shout(42)` transpiles unchanged; `tsc` reports TS2345; the output throws `TypeError` at runtime.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Topic page | Server `content.tsx` + client demo leaves | — | src/handbook/build-pipeline/content.tsx |
| Code display | `CodePanel` with real sizes | Ad-hoc `pre` | src/handbook/build-pipeline/code-panel.tsx |
| Controls | `Choice`, `Toggle`, shadcn `Tabs`, `Textarea`, `Button` | Hand-rolled tabs | src/handbook/jwt/token-view.tsx:127 |
| Simplified label | "Simplified compiler" + listed subset | Implying full TS support | knowledge feature:017/026 |
| Pure logic | Framework-free modules, testable in node | Logic inside components | src/handbook/build-pipeline/hashing.ts |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `CodePanel`, `useSize`, `sizeLabel` | src/handbook/build-pipeline/ | import (section-shared) |
| `Topic`, `Toc` | src/handbook/ | import |
| `Choice` / `Toggle` | src/handbook/jwt/token-view.tsx, src/handbook/ui.tsx | import |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| `Token` | `{ kind, text, start, end, line, column }` (kinds: keyword, identifier, punctuator, number, string, template, jsxText, jsxIdentifier) |
| `Node` | ESTree-style `{ type, start, end, ... }` incl. TS nodes (`TSTypeAnnotation`, `TSInterfaceDeclaration`, `TSTypeAliasDeclaration`, `TSAsExpression`, `TSSatisfiesExpression`, `TSNonNullExpression`, `TS*Type`) and JSX nodes |
| `CompileResult` | `{ tokens, ast, code, map, mappings, error }`; `error = { message, line, column }` |
| `Mapping` | `{ genLine, genColumn, srcLine, srcColumn, name? }` (0-based), encoded to Source Map v3 |
| `Construct` (data) | `{ id, label, source, tsOutput, babelOutput, erasable, diagnostics[], notes }` generated from TS 5.9.3 / Babel 7.29.9 |
| `LoweringSample` (data) | `{ id, label, source, outputs: Record<Target, string>, builtin? }` from TS 5.9.3 |

### API Contracts

None (client-only).

## Decisions

| Decision | Rationale |
|----------|-----------|
| Hand-built recursive-descent compiler (scanner + parser + transform + codegen + source map) in `src/handbook/transpiling/compiler/` | The page's point is to show the stages; real compilers can't run on Workers or are multi-MB in the browser; a ~1.5k-line subset compiler is readable and fast |
| Reference = TypeScript `transpileModule` ESNext output; scratch test compares on whitespace-normalized text | TypeScript is already a devDependency; gives an objective "matches the real transform" check |
| Parser-driven scanner (JSX text scanned on demand), tokens recorded once per start offset | JSX tokenization depends on parser context; dedupe avoids repeated tokens after backtracking |
| Arrow functions by backtracking (try params + `=>`, else restore) | Simplest correct approach for `(a: T) => …` vs `(expr)` |
| Template literals: one token; `${}` expressions parsed by a sub-parser at an offset | Keeps the scanner small while still supporting a common React idiom |
| Unsupported syntax → error with line:column naming the construct (e.g. "enum is outside this compiler's subset; see topic 02") | Satisfies AC-003, teaches the boundary |
| Last good result kept, marked stale, on error | AC-003 |
| Compile on every edit via `useDeferredValue` | Typing stays responsive; compile is synchronous and pure |
| Topic 02/04 data generated at authoring time into `constructs.ts` / `lowering.ts`, labelled with tool + version | AC-006/011 require real outputs |
| Run-the-output button uses `new Function` with a captured `console` | Real proof the transpiled code runs and fails at runtime (AC-008); input is fixed page data, not user input |
| AST view: nested `ul role=tree` is overkill; use nested lists of buttons (`aria-pressed` for the selected node) | Keyboard-operable with Tab/Enter, no custom tree keyboard model needed |
| Source map view: output segments as buttons in a list plus the colored output; selecting one highlights the source range | Pointer and keyboard (AC-014) |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| catalog | src/practices/catalog.ts | modify | `transpiling` written: true |
| Route | src/app/(playground)/under-the-hood/transpiling/page.tsx | new | TopicFrame |
| AST/tokens types | src/handbook/transpiling/compiler/ast.ts | new | types |
| Scanner | compiler/scanner.ts | new | chars → tokens, JSX text mode, templates |
| Parser | compiler/parser.ts | new | tokens → AST (TS + JSX subset), errors with positions |
| Transform | compiler/transform.ts | new | strip TS, JSX classic/automatic |
| Codegen | compiler/codegen.ts | new | AST → JS + mappings |
| Source map | compiler/sourcemap.ts | new | VLQ encode/decode, v3 JSON |
| Facade | compiler/index.ts | new | `compile(source, { jsx })` never throws |
| SourceView | src/handbook/transpiling/source-view.tsx | new | source with a highlighted range |
| AstTree | ast-tree.tsx | new | selectable tree |
| CompilerDemo | compiler-demo.tsx | new | topic 01 |
| constructs data + ErasableDemo | constructs.ts, erasable-demo.tsx | new | topic 02 |
| JsxDemo | jsx-demo.tsx | new | topic 03 |
| lowering data + LoweringDemo | lowering.ts, lowering-demo.tsx | new | topic 04 |
| SourceMapDemo | sourcemap-demo.tsx | new | topic 05 |
| Content | content.tsx | new | text, advice, links |

## Data Flow

1. Textarea → `useDeferredValue(source)` → `compile()` (memoized) → tokens/AST/code/map.
2. Tree selection → `[start, end]` → SourceView highlight.
3. Mapping selection → decoded segment → SourceView highlight at line:column.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001..005 | CompilerDemo, AstTree, SourceView, compiler/* | compiler-demo.tsx | Planned |
| AC-006..008 | ErasableDemo, constructs.ts | erasable-demo.tsx | Planned |
| AC-009..010 | JsxDemo, transform.ts | jsx-demo.tsx | Planned |
| AC-011..012 | LoweringDemo, lowering.ts | lowering-demo.tsx | Planned |
| AC-013..014 | SourceMapDemo, sourcemap.ts | sourcemap-demo.tsx | Planned |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Framework | none in repo; scratch node scripts + browser (Puppeteer + axe) |
| Command | `pnpm typecheck && pnpm lint && pnpm build` |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| compiler | scratch compare script | page samples + 15 extra snippets, both JSX modes, vs `ts.transpileModule` (whitespace-normalized); error positions; empty input; VLQ round-trip |
| page | scratch Puppeteer | each AC interaction, axe light/dark, 360 px, keyboard |

## Considerations

### Error Handling

- `compile()` catches everything; parser errors carry offsets → line/column. An internal error (bug) is reported as "Internal compiler error" rather than crashing.

### Security

- Live compiler output is shown as text only, never executed. Only the fixed type-error sample is executed.

## Open Questions

- None

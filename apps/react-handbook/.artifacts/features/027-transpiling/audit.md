---
id: "027"
feature: transpiling
created: 2026-10-13
---

# Audit: Transpiling: TypeScript and JSX to JavaScript

## Goals

- [x] Five topics, each with a working demo: live compiler (tokens/tree/output), erasable constructs + type-error run, JSX runtimes, lowering by target, source maps. All exercised by a Puppeteer script (no console errors).
- [x] The reader's own TS/JSX goes through every stage live: editing updates tokens (147 for the sample), tree (type nodes marked), output; tree/token selection highlights the source; errors show line:column and keep the last good output marked stale.
- [x] "Real tool output" is real: constructs and lowering data were generated from the installed TypeScript 5.9.3 and Babel 7.29.9 (generator in the scratchpad, header comments in the files); diagnostics from a TypeScript program with erasableSyntaxOnly/isolatedModules; the type-error sample really throws `TypeError: name.toUpperCase is not a function` when run.

## Success Criteria

- [x] Live compiler output equals `ts.transpileModule` (ESNext; react-jsx and react) ignoring whitespace for the page's 5 samples and 26 more (36/36 comparisons across both runtimes).
- [x] axe: no violations in light and dark at 1280 and 360 px with demos in opened states (one light-mode contrast issue in selected rows fixed); no horizontal overflow at 360 px; tree, token and segment lists operable by keyboard (Tab + Enter, aria-pressed).
- [x] typecheck, lint, build pass.

## Notes

- Source maps: every named mapping (90 across the samples) points at that exact name in both source and output; VLQ round-trips.
- Edge cases: empty source compiles to empty output; Reset restores the sample; a 21 KB input compiles in ~13 ms.
- Server-side unchanged: the page is static (prerendered); the compiler runs only in the browser.

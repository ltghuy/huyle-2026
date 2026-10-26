---
id: "028"
feature: bundlers
created: 2026-10-13
---

# Audit: Bundlers: graph, runtime, chunks and dev servers

## Goals

- [x] Five topics with working demos: resolver + module graph, runtime, tree shaking, code splitting, dev servers + HMR; all exercised by a Puppeteer script with no console errors.
- [x] One bundler drives the demos and reacts to edits: editing package.json changed the resolved file (condition reorder → index.mjs); adding an unresolvable import showed the error; adding a used import formed a reported cycle.
- [x] Bundles really execute in the page: run log shows each module running once with cache hits; openHelp() downloads help.chunk.js after the simulated delay; the circular sample throws the real TDZ ReferenceError.

## Success Criteria

- [x] Run log order equals Node's native ESM run of the same files (format → cart → analytics → main; cycle: "b: running" then ReferenceError) — scratch script.
- [x] axe clean light/dark at 1280 and 360 px with demos opened (duplicate "Run log" landmark fixed); no horizontal overflow.
- [x] typecheck, lint, build pass; the 027 compiler still matches TypeScript on all samples after the `new X<T>()` parser addition.

## Notes

- Tree shaking: 7/7 modules → 5/7 with "sideEffects": false (cart/user icons dropped with reason); /*#__PURE__*/ removes createRegistry() (3.3 kB → 2.3 kB).
- Splitting: without shared chunk the chart module is downloaded twice and runs once (cache hit); with it, shared + about load in parallel; reopening a route downloads nothing.
- Edge cases: empty file builds; runaway recursion reports RangeError; a log flood stops at the 500-step budget with the reason shown.

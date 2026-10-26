---
id: "032"
feature: monorepo-best-practices
created: 2026-10-20
---

# Audit: Monorepo best practices

## Goals

- [x] A reader can lay out a new monorepo from the topic alone — topic 07 covers top-level folders, package shape (one purpose, own manifest, exports), one scope with folder-matching names and `private`, layers checked in lint and CI, shared config packages with a pinned package manager and a catalog, and CODEOWNERS ordering plus required code-owner review (browser-verified).
- [x] The demo inspects every folder of the sample repo (17 entries: purpose, layer, allowed imports, published version, owners) and tests CODEOWNERS paths in three files, including the catch-all-last mistake — browser-verified.

## Success Criteria

- [x] The tester names the owner from the last matching line for every sample path (scratch check: 24 cases, including leading slash and spaces, `**`, anchoring, and per-project owners equal to the boundaries demo's).
- [x] axe: no violations from the page in light and dark at 1280 px and 360 px; no page-level horizontal scroll at 360 px.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Notes

- The remaining axe `region` finding is the app sidebar wrapper, also present on other pages (see the 031 audit).
- The topic text was written against the humanizer rules: no stock contrasts, one-line closers, bold labels or dashes.

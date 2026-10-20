---
id: "031"
feature: design-monorepo
created: 2026-10-20
---

# Audit: Design a frontend monorepo

## Goals

- [x] Reachable from sidebar, section page and home (System Design 4 of 4), and listed by the method page and both case studies — catalog row added; `/system-design/monorepo` prerendered (static); section page shows "4 of 4 pages written" and two links to the page; method, news-feed and autocomplete "next" blocks link it (browser-verified).
- [x] Applies the method end to end with the four deep dives — six topics: requirements + architecture, tooling, affected/caching, boundaries/ownership, dependencies/versioning, CI/DX (browser-verified).
- [x] Each deep dive has an interactive reference and figures are labelled examples with an alternative — affected/cache, boundaries, versioning and CI demos respond to input; the architecture figure names polyrepo and micro-frontends; boundary rules and the CI model are labelled one example / a model.

## Success Criteria

- [x] Leaf change → only itself; ui → its 5 dependents; utils → all 8 code projects; repeat run 8/8 hits; CI gets 8/8 remote hits with the shared cache and 0 with local only — scratch check (27 scenarios) and browser run.
- [x] Forbidden imports rejected with the rule (app-to-app, layer, public entry points), the cycle shows `@acme/auth → @acme/billing → @acme/auth` — browser presets + scratch.
- [x] Policy switch: 3 copies → 1; recording a utils major gives ui and api-client patch bumps with "Updated dependencies" changelog entries; fixed mode bumps the group together — browser + scratch.
- [x] CI chart and table respond to repo size and change share; strategies ordered everything ≥ affected ≥ +cache ≥ +agents for all 16 input pairs, and affected = everything at 100% — scratch.
- [x] axe: no violations from the page in light and dark at 1280 px and 360 px (after running the demos); no horizontal page scroll at 360 px; controls are native inputs/buttons plus the shadcn Select (opened and moved with the keyboard).
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Notes

- axe reports one `region` violation on the app sidebar wrapper (`.group`) at desktop width. It is outside this page and the same on `/system-design/autocomplete`, so it predates this feature.
- Tool facts come from `.artifacts/research/monorepo-tooling.md` (researched 2026-10-20); unverified cells were left out of the matrix.
- Structural changes detected -- consider running `/project-index re-index` to refresh `.agents/codebase/*.md`.

---
id: "033"
feature: design-micro-frontends
created: 2026-10-20
---

# Audit: Design micro frontends

## Goals

- [x] Reachable from sidebar, section page and home (System Design 5 of 5), and linked from the method page and the monorepo case study: catalog row added; `/system-design/micro-frontends` prerendered (static); home shows "5 of 5 pages written"; method, news-feed, autocomplete and monorepo pages link it (build output and served HTML).
- [x] Applies the method end to end: seven topics (requirements and architecture, whether to use micro frontends, composition, shared dependencies, routing and communication, releases and failure isolation, styling), browser-verified.
- [x] Every topic has an interactive reference and figures are labelled as one example with an alternative: the diagram caption names the route-level split, the fit rules, timeline model, sharing rules, contract and deploy demos are each labelled simplified or one example.

## Success Criteria

- [x] Fit: one team gives "one app"; rare blocking gives "modular"; many teams blocking weekly with mixed pages and SEO gives edge composition, without SEO client runtime, whole pages route-level split; reasons listed (scratch, 7 cases).
- [x] Composition: each of the six approaches changes the timeline, properties and highlighted tool rows; tool table dated October 2026 (browser).
- [x] Sharing: compatible ranges give 1 copy under every option and strategy (8 combinations); an old major with singleton warns, with strict throws, without singleton loads its own copy (2 copies, 50 kB extra, stateful warning); loaded-first keeps the shell's copy (scratch + browser).
- [x] Routing: 12 paths map to their owner or not-found, including normalisation; add-field is compatible, rename breaks both listeners, remove price breaks only the mini cart, string price concatenates (scratch + browser).
- [x] Deploy: release and rollback change only that piece's version; crash with isolation degrades, without isolation the page goes down; shell crash is down either way; slow piece waits without isolation; contract build shows wrong data (scratch + browser).
- [x] Styling: no isolation reports both leaks; prefix and scoped names report none; shadow tree reports none, theme variable and font crossing, and the design system's button styles missing, read with getComputedStyle (browser).
- [x] axe: no violations in light and dark across three sets of demo states (one dark-mode contrast issue on the demo's red button fixed); no horizontal page scroll at 360 px across all composition approaches; all controls are native inputs and buttons or the shadcn Select. Real Tab presses can't be sent through the Puppeteer MCP, so keyboard use was checked by control type, not by pressing keys.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Notes

- Tool facts come from `.artifacts/research/micro-frontends.md` (researched 2026-10-20). Where the MF 2.0 docs and runtime source disagree, the page follows the source.

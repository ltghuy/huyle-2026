---
id: "026"
feature: under-the-hood-pipeline
created: 2026-10-13
---

# Audit: Under the Hood section + "From source to bundle"

## Goals

- [x] Sixth section reachable from home and sidebar, listing five pages (one written, four not ready): home card "1 of 5 pages written"; `/under-the-hood` lists 5 cards (1 Written, 4 Coming soon); sidebar folder with 5 entries, header "15 topics"; unwritten URLs render a placeholder (200), unknown slugs 404. Browser-verified.
- [x] Five topics, each with a working demo: toolchain explorer, stage stepper, dev/prod switch, content-hash editor, real build files. Every interaction exercised by a Puppeteer script at 1280 and 360 px in light and dark.
- [x] At least one demo measures this site's real build: "What this page loaded" lists 17 Turbopack chunks from Resource Timing (~276 kB transferred on first load; all 17 "Browser cache" after reload). Sizes and hashes in the other demos are also measured in the browser.

## Success Criteria

- [x] axe clean on the page with demos in their opened states (light + dark, 1280 + 360), no horizontal overflow at 360 px. The only finding, `region` on the sidebar shell, also appears on existing pages (e.g. /browser-platform/rendering) and predates this feature.
- [x] Tool facts match official sources: react.dev CRA sunset post, vite.dev Vite 8 announcement + build options + dep pre-bundling, bundled Next.js 16 docs (Turbopack, building, TypeScript); recorded in .artifacts/research/build-toolchains.md and linked from the page.
- [x] typecheck, lint, build pass.

## Notes

- Hash cascade logic checked with a scratch script (5 scenarios: lazy-page edit with/without runtime chunk, app edit, React upgrade with/without vendor chunk) before wiring the UI.
- AC-016 and the "no timing data" edge case verified by stubbing `performance.getEntriesByType` (same-origin files always expose sizes).
- Keyboard: stage buttons reachable with Tab and activated with Enter (aria-current moves); code panels are focusable scroll regions.

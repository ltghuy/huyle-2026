---
id: "035"
feature: testing-section
created: 2026-10-21
---

# Audit: Testing section + "Testing strategy"

## Goals

- [x] The section and the strategy page are one click from the sidebar and the home page, and the section lists all four planned pages: home card "1 of 4 pages written" linking to `/testing`; `/testing` shows 4 cards (1 Written, 3 Coming soon); the sidebar has a Testing folder with 4 entries (header now "21 topics"); the 3 unwritten URLs render the "being written" note (200) and unknown slugs 404.
- [x] Five topics, each about a screen of reading with a demo whose result changes with input: change picker with live test results, suite mix with presets, case classification, the same test run three ways against a changing server, and stage placement with feedback times. Every demo was driven by script in the browser.
- [x] The classification exercise covers 8 cases from this site's practices and topics; each reveals the recommended level, the reason and what the learner's level would miss or cost, and the summary counts agreements and cases left.

## Success Criteria

- [x] All 4 sample bugs fail a behaviour test and pass every implementation-detail test; both refactors pass every behaviour test and fail one detail test (scripted over all 7 changes).
- [x] axe in dark and light: no violations from this page; the only finding, `region` on the sidebar shell, appears on every page and predates this feature. Light-mode contrast of the pre-commit warning passes. No horizontal overflow at 360 px with every demo in its opened state. Every control is a native input, button, summary or Base UI trigger reachable by Tab; axe label and name rules pass.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Notes

- Route: `curl` gives 200 with v1 and v2 bodies, and 422 for an unknown shape or a query over 40 characters.
- Doubles: with v1 all three pass; with v2 the mock passes while the fake and the real server fail with "Cannot read properties of undefined (reading 'map')".
- Shapes: all counts at zero shows "nothing is caught" with 0 values and no NaN.
- All 11 cited sources answered 200 on 2026-10-21.
- Found while auditing, outside this feature: each home section card's text includes a stray "x" before its progress count (recorded in knowledge.md).
- Fixed after the audit: the suite-shape demo passed raw catch chances to the progress bars, and the last digit differed between the server render and a real browser (hydration warning reported by the user). The value is now rounded to a whole percent, which is what the page shows.

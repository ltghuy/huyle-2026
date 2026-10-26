---
id: "036"
feature: e2e-playwright-pom
created: 2026-10-21
---

# Audit: End-to-end testing with Playwright and the Page Object Model

## Goals

- [x] `pnpm test:e2e` builds the site, serves it on port 3100 and runs 12 tests in Chromium (Playwright 1.64.1) through page objects, component objects and fixtures; it passed three runs in a row with 0 retries (11 to 13 s each).
- [x] The page quotes the suite's files from the snapshot written by the same run (checked: the snapshot matches every file on disk) and shows that run: 12 passed, 0 failed, 0 flaky, 0 skipped, with per-test time and retries and the run date.
- [x] Five topics, each with a demo whose output changes with input: the recorded run with a quoted test and its page object, the locator tester, the waiting race, the page-object comparison, and the CI sizing model.

## Success Criteria

- [x] Three consecutive local runs passed with no retries.
- [x] axe: no violations from this page in dark or light (after raising the line-number contrast); the sidebar `region` finding is pre-existing. No horizontal overflow at 360 px with demos run. Controls are native inputs, buttons and Base UI selects.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build` and `pnpm test:e2e` pass.

## Notes

- Locator demo, scripted over all five versions of the form: the test id held 4 of 4 changes, label 3 of 4 (broke on translation), role and name 2 of 4 (broke on rewording and translation), CSS 6 of 8; `getByText("Create account")` matches the heading and the button and is reported as ambiguous.
- Waiting demo (30 runs, 300 ± 400 ms): fixed sleep failed 6, manual poll failed 5, the auto-waiting assertion passed all 30.
- Page-object comparison, counted from the recorded files: rename Next 1 vs 2 lines, move Email 3 vs 3, split the step 5 vs 6.
- The suite found a real bug in the multi-step form (a status line moved Next between press and release, losing the click); fixed in quick task 020 before the recorded runs.
- Client bundles don't contain the suite snapshot; the quoted files travel in the page's server-rendered payload.
- All 15 cited sources answered 200 on 2026-10-21.

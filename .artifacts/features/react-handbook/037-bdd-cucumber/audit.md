---
id: "037"
feature: bdd-cucumber
created: 2026-10-21
---

# Audit: Behaviour-driven tests with Cucumber

## Goals

- [x] Two feature files (discount codes: background, two rules, an outline with three rows, tags; job application: background, an outline with two rows, tags) run with `pnpm test:e2e` through playwright-bdd and pass: 9 scenarios beside the 12 specs, 21 tests, three runs in a row with 0 retries.
- [x] The documentation view shows both features as plain text with each scenario's and each examples row's latest result and duration, the run date, and a tag filter (@application, @cart, @smoke).
- [x] Five topics with demos: documentation view, step library with the inspector, scenario checker, the same checker with lint on an imperative sample, and the worth-it check.

## Success Criteria

- [x] Every scenario passes and appears in the run summary under its feature.
- [x] Every step in the repo's features matches its definition in the step library; a new step ("I remove the discount code") is reported undefined with a suggested definition. The checker uses the runner's own parser and expression packages.
- [x] axe: no violations in dark or light (after fixing a heading level in the checker); no horizontal overflow at 360 px; no console errors on load.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build` and `pnpm test:e2e` pass.

## Notes

- Ambiguous steps are reported with the clashing definitions (checked by script with two overlapping patterns). The repo's own step library has no overlap, so the page can't show it with its real steps; the text explains it.
- Writing the steps hit strict mode again: `getByLabel("Quantity of Blue notebook")` also matched the "Decrease/Increase quantity of …" buttons; the page object uses the textbox role.
- An outline's example titles follow playwright-bdd: placeholders filled in when the outline name has them ("SAVE10 gives 10% off"), otherwise "Example #n".
- The parser and matcher load only on this page's client bundle.
- All cited sources answered 200 on 2026-10-21 (playwright-bdd hash routes checked against its docs folder).

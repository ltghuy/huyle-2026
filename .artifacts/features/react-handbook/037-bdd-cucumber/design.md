---
id: "037"
feature: bdd-cucumber
created: 2026-10-21
---

# Technical Design: Behaviour-driven tests with Cucumber

## Scope

In: two Gherkin feature files under `e2e/features/`, their step definitions
under `e2e/steps/`, playwright-bdd wiring in the existing suite, and the page
`/testing/bdd-cucumber` with five topics. Out: a separate Cucumber runner,
editing repo files from the page, Gherkin in other languages.

## Research Summary

From the installed packages (`playwright-bdd` 9.2.1, `@cucumber/gherkin` 39.1, `@cucumber/messages` 32.3, `@cucumber/cucumber-expressions` 19.0.0):

- `defineBddConfig({ features, steps, importTestFrom, outputDir })` returns a test directory of generated specs; `bddgen` writes them. Each scenario becomes a Playwright test titled with the scenario name; outline rows are titled with placeholders filled in, or "Example #n" when the outline name has none.
- `createBdd(test)` gives `Given/When/Then` whose steps receive the test's fixtures; `importTestFrom` points generated files at the shared fixtures, which must extend playwright-bdd's `test`.
- `Parser` + `AstBuilder` + `GherkinClassicTokenMatcher` parse; `compile(document, uri, newId)` expands outlines into pickles; parse errors carry `location`.
- `CucumberExpression(pattern, registry).match(text)` returns arguments or null; `CucumberExpressionGenerator` suggests an expression for an unmatched step.

## Decisions

| Decision | Rationale |
|----------|-----------|
| playwright-bdd inside the existing suite (second project "scenarios"), `test:e2e` = `bddgen && playwright test` | One command and one reporter for specs and scenarios (spec AC-001) |
| Shared fixtures extend playwright-bdd's `test` | Specs and steps use the same page-object fixtures |
| Steps call page objects only; a `field(label)` method was added to the form page object | AC-002: no element lookups in steps |
| The reporter maps generated files back to their `.feature` and records no line for them | The generated line means nothing to a reader |
| The page uses the same parser and expression packages, pinned to playwright-bdd's versions | The checker agrees with the runner |
| Step definitions are read from the recorded step files with a pattern over `Given/When/Then("…", …);` blocks | The library lists exactly what ran; the step files keep one definition per block |
| Results are matched to the documentation by feature name and scenario title (outline rows by the runner's title rule) | Line numbers of generated files don't map to the source |
| Parsing uses incrementing ids | Server and client renders are identical |
| Scenario lint is a set of heuristics with reasons (interface words, selectors, several actions, long, no Then, hidden checks) | AC-012; labelled as rules of thumb in the text |
| Drafts are kept in localStorage per editor, wrapped in try/catch | Edge case: a reload keeps the learner's draft; blocked storage just doesn't |

## Component Design

| Component | File | Action |
|-----------|------|--------|
| Features | e2e/features/discount-codes.feature, job-application.feature | new |
| Steps | e2e/steps/cart.steps.ts, application.steps.ts | new |
| Cart page object | e2e/pages/cart.page.ts | new |
| Form page object | e2e/pages/multi-step-form.page.ts | modify (`field`) |
| Fixtures, config, reporter | e2e/fixtures.ts, playwright.config.ts, e2e/reporters/handbook-reporter.ts | modify |
| Gherkin helpers | src/handbook/bdd/gherkin.ts, step-defs.ts, lint.ts | new |
| LivingDocs, StepInspector, StepLibrary, ScenarioEditor, WorthItDemo | src/handbook/bdd/*.tsx | new |
| Content and route | src/handbook/bdd/content.tsx, src/app/(playground)/testing/bdd-cucumber/page.tsx | new |
| Catalog, README, package.json, tsconfig, eslint, .gitignore | | modify |

## Requirements Traceability

| Requirement | Where |
|-------------|-------|
| AC-001 to AC-003 | playwright.config.ts, e2e/features, e2e/steps, e2e/fixtures.ts |
| AC-004 | catalog.ts, route, links from the strategy and Playwright pages |
| AC-005, AC-006 | content.tsx, living-docs.tsx |
| AC-007, AC-008 | step-inspector.tsx, step-library.tsx, content.tsx |
| AC-009 to AC-011 | scenario-editor.tsx, gherkin.ts |
| AC-012, AC-013 | lint.ts, scenario-editor.tsx, content.tsx |
| AC-014 | worth-it-demo.tsx, content.tsx |
| AC-015 | content.tsx (advice and links) |

## Test Strategy

`pnpm test:e2e` (21 tests: 12 specs and 9 scenarios), browser checks of every demo, axe in both themes, 360 px, `pnpm typecheck && pnpm lint && pnpm build`.

## Open Questions

- None

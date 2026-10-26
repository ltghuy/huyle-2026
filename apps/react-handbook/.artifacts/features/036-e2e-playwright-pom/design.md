---
id: "036"
feature: e2e-playwright-pom
created: 2026-10-21
---

# Technical Design: End-to-end testing with Playwright and the Page Object Model

## Scope

In: a Playwright suite under `e2e/` that tests four practice pages through page
objects and fixtures, a `pnpm test:e2e` command, a reporter that records each
run for the page, and the page `/testing/e2e-playwright` with five topics.
Out: a CI pipeline, cross-browser projects in the default run, Gherkin (037).

## Research Summary

From the installed package (`@playwright/test` 1.64.1, `node_modules/playwright/types/testReporter.d.ts`):

- Reporter hooks used: `onBegin(config, suite)`, `onTestEnd(test, result)` (`result.status`, `retry`, `duration`, `error`), `onEnd(result)` (`startTime`, `duration`, `status`); `test.outcome()` gives expected / unexpected / flaky / skipped; `titlePath()` is `["", project, file, ...describes, title]`.
- `page.clock.install()` before `goto` fakes timers; `clock.runFor(ms)` moves them.
- Locators: `getByRole(role, { name, exact })` matches the accessible name as a case-insensitive substring unless `exact`; strict mode fails an action or assertion when more than one element matches.
- `expect` retries with intervals 100, 250, 500, 1000 ms up to a 5 s default timeout.
- Sources the page cites: playwright.dev (best practices, locators, auto-waiting, page object models, fixtures, retries, trace viewer, CI) and Martin Fowler's "PageObject".

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Topic page | `content.tsx` + `Toc` + `Topic`, client demos as leaves | | src/handbook/testing/content.tsx |
| Client-only DOM work | `useSyncExternalStore` "mounted" flag, compute in render | `setState` in effects | src/handbook/e2e/locator-demo.tsx |
| Models | Labelled, assumptions shown | Presenting as measured | src/handbook/testing/shapes-demo.tsx |
| Locators in the suite | Role, label and accessible names; scope to named regions | CSS classes, test ids where a role exists | e2e/pages/*.ts |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `Topic`, `Toc`, `Choice`, `Verdict` | src/handbook/ | import |
| `TopicFrame`, `PageDates` | src/components/playground/ | via route |
| Practice pages under test | src/practices/{debounced-search,multi-step-form,accessible-modal,toast-notifications} | tested, unchanged except quick task 020 |

## Data Model

### Entities

| Entity | Purpose |
|--------|---------|
| Run summary (`src/handbook/e2e/last-run.json`) | `ranAt`, `durationMs`, `status`, `project`, `playwright`, `totals`, `tests[]` (`file`, `line`, `describe`, `title`, `outcome`, `durationMs`, `retries`, `error?`) |
| Suite snapshot (`src/handbook/e2e/suite-files.json`) | path → file text for `playwright.config.ts` and `e2e/**/*.ts`, written by the same run |
| `topicPages` entry `e2e-playwright` | `written: true` with dates |

### API Contracts

None. The page reads the two JSON files at build time.

## Decisions

| Decision | Rationale |
|----------|-----------|
| The reporter writes the run summary and a copy of the suite's files in one go | The quoted code is exactly the code of the recorded run; re-running the suite refreshes both |
| The page imports the JSON (no `fs` at render) | Works on Cloudflare Workers, where pages may re-render without a file system |
| `webServer` runs `pnpm build && pnpm start --port 3100` | Tests a production build on its own port, beside a running dev server |
| One Chromium project, `reducedMotion: "reduce"`, retries only on CI, trace on first retry | Fast, deterministic local runs; CI keeps evidence for flaky failures |
| Tests set the practices' own controls (no jitter, fixed latency, "shorter queries slower") and use a fake clock for toasts | Order and timing are chosen by the test, never by chance |
| Component objects `DemoControls` and `Notifications`, page objects per practice, fixtures that open each page | Shows composition and fixture hand-off with real code |
| The no-page-object version of the multi-step form tests is a real spec in the suite | The comparison quotes code that runs and passes |
| Locator demo: a simplified matcher (implicit roles, accessible name, label, text, test id, CSS) on a sample form parsed with DOMParser after mount | Real matching against real markup; labelled as following Playwright's rules for the cases shown |
| Waiting demo: three strategies against a stand-in app on real timers, run concurrently | Real waiting, finishes in about the longest delay |
| UI-change demo: per change, a pattern marks the lines each version must edit, counted from the quoted files | Counts come from the real files |
| CI model: tests × average time / (workers × machines) + per-machine setup + retried share | Simple, labelled |
| ESLint `react-hooks/rules-of-hooks` off for `e2e/**` | Fixture `use()` is not React's `use` |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| Config | playwright.config.ts | new | project, web server, reporter |
| Component objects | e2e/components/demo-controls.ts, notifications.ts | new | shared regions |
| Page objects | e2e/pages/*.page.ts | new | one per practice |
| Fixtures | e2e/fixtures.ts | new | open page, hand over page object |
| Specs | e2e/specs/*.spec.ts | new | 12 tests, incl. the no-page-object file |
| Reporter | e2e/reporters/handbook-reporter.ts | new | run summary + suite snapshot |
| Suite data | src/handbook/e2e/suite.ts | new | typed access to the two JSON files |
| CodeBlock | src/handbook/e2e/code-block.tsx | new | quoted file with line numbers and marked lines |
| RunSummary | src/handbook/e2e/run-summary.tsx | new | latest run table, empty state |
| LocatorDemo | src/handbook/e2e/locator-demo.tsx, locators.ts, sample-form.ts | new | AC-008, AC-009 |
| WaitDemo | src/handbook/e2e/wait-demo.tsx, waits.ts | new | AC-010, AC-011 |
| PomDemo | src/handbook/e2e/pom-demo.tsx | new | AC-013, AC-014 |
| CiDemo | src/handbook/e2e/ci-demo.tsx | new | AC-016 |
| Content | src/handbook/e2e/content.tsx | new | five topics |
| Route | src/app/(playground)/testing/e2e-playwright/page.tsx | new | page |
| Catalog, README, package.json, .gitignore, eslint config | | modify | wiring |

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | config, script, README | playwright.config.ts, package.json, README.md | Planned |
| AC-002, AC-003 | specs, page objects | e2e/ | Planned |
| AC-004 | reporter | e2e/reporters/handbook-reporter.ts | Planned |
| AC-005 | catalog, route | catalog.ts, e2e-playwright/page.tsx | Planned |
| AC-006, AC-007 | content, RunSummary, CodeBlock | src/handbook/e2e/ | Planned |
| AC-008, AC-009 | LocatorDemo | locator-demo.tsx | Planned |
| AC-010 to AC-012 | WaitDemo, content | wait-demo.tsx, content.tsx | Planned |
| AC-013 to AC-015 | PomDemo, CodeBlock, content | pom-demo.tsx, content.tsx | Planned |
| AC-016, AC-017 | CiDemo, content | ci-demo.tsx, content.tsx | Planned |
| AC-018 | content | content.tsx | Planned |

## Test Strategy

| Aspect | Detail |
|--------|--------|
| Framework | Playwright 1.64.1 (the suite itself) plus browser checks of the page |
| Command | `pnpm test:e2e`; `pnpm typecheck && pnpm lint && pnpm build` |

## Considerations

- A missing or empty run summary renders the empty state with the command (AC-007).
- The suite exposed a real bug in the multi-step form (a status line moved the Next button mid-click); fixed as quick task 020.
- Re-running the suite rewrites the two JSON files; commit them with the change that ran them.

## Open Questions

- None

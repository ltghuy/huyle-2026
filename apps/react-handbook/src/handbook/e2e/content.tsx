import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { practiceHref, topicHref } from "@/practices/catalog";

import { CiDemo } from "./ci-demo";
import { CodeBlock } from "./code-block";
import { LocatorDemo } from "./locator-demo";
import { PomDemo } from "./pom-demo";
import { RunSummary } from "./run-summary";
import { OUTCOME_LABEL, POM_PATHS, recordedTest, suiteFile } from "./suite";
import { WaitDemo } from "./wait-demo";

const PW = "https://playwright.dev/docs";

const TOPICS = [
  { id: "proves", title: "What an end-to-end test proves" },
  { id: "locators", title: "Locators that survive redesigns" },
  { id: "waiting", title: "Waiting, and where flaky tests come from" },
  { id: "page-objects", title: "Page objects and fixtures" },
  { id: "ci", title: "Running in CI and reading a failure" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

const CI_EXAMPLE = `# .github/workflows/e2e.yml (an example; this repo has no CI pipeline)
name: e2e
on: [pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm exec playwright test --shard=\${{ matrix.shard }}/2
        env: { CI: "true" }
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: playwright-report-\${{ matrix.shard }}
          path: playwright-report/`;

function ProvesDemo() {
  const file = "e2e/specs/debounced-search.spec.ts";
  const result = recordedTest(file, "without a guard, a late reply for an older query replaces newer results");
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <RunSummary />
      <div className="flex min-w-0 flex-col gap-2">
        <h4 className="text-sm font-medium">One test and its page object</h4>
        <p className="text-sm text-foreground/85">
          {result
            ? `The first test below ${OUTCOME_LABEL[result.outcome].toLowerCase()} in ${(result.durationMs / 1000).toFixed(1)} s in the latest run.`
            : "This test has no recorded result yet."}{" "}
          It turns the search&apos;s safeguards off, makes short queries answer slowly, types &quot;walnut&quot; and checks that the late reply for &quot;wa&quot; wins.
        </p>
        <div className="grid min-w-0 gap-3 xl:grid-cols-2">
          <CodeBlock path={file} code={suiteFile(file)} />
          <CodeBlock path="e2e/pages/debounced-search.page.ts" code={suiteFile("e2e/pages/debounced-search.page.ts")} />
        </div>
      </div>
    </div>
  );
}

function PageObjectsDemo() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PomDemo files={{ pageObject: suiteFile(POM_PATHS.pageObject), pomSpec: suiteFile(POM_PATHS.pomSpec), rawSpec: suiteFile(POM_PATHS.rawSpec) }} />
      <div className="flex min-w-0 flex-col gap-2">
        <h4 className="text-sm font-medium">How they compose</h4>
        <p className="text-sm text-foreground/85">
          The controls panel is a component object that three page objects reuse, and the fixtures open each page and hand its page object to the test.
        </p>
        <div className="grid min-w-0 gap-3 xl:grid-cols-2">
          <CodeBlock path="e2e/components/demo-controls.ts" code={suiteFile("e2e/components/demo-controls.ts")} />
          <CodeBlock path="e2e/fixtures.ts" code={suiteFile("e2e/fixtures.ts")} />
        </div>
      </div>
    </div>
  );
}

function CiTopicDemo() {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <CiDemo />
      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
        <CodeBlock path="playwright.config.ts" code={suiteFile("playwright.config.ts")} />
        <CodeBlock path=".github/workflows/e2e.yml (example)" code={CI_EXAMPLE} />
      </div>
    </div>
  );
}

export function PlaywrightHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          This repo has a real end-to-end suite: Playwright drives a production build of this site in Chromium and tests four practices, the{" "}
          <Link href={practiceHref("debounced-search")} className={inline}>
            debounced search
          </Link>
          ,{" "}
          <Link href={practiceHref("multi-step-form")} className={inline}>
            multi-step form
          </Link>
          ,{" "}
          <Link href={practiceHref("accessible-modal")} className={inline}>
            accessible modal
          </Link>{" "}
          and{" "}
          <Link href={practiceHref("toast-notifications")} className={inline}>
            toasts
          </Link>
          , through page objects, and its Gherkin scenarios cover the shopping cart too. Run it with <code className="font-mono text-sm">pnpm test:e2e</code> after a one-time{" "}
          <code className="font-mono text-sm">pnpm exec playwright install chromium</code>. Each run records its results and a copy of the suite&apos;s files, and this
          page shows that recording, so the code quoted here is the code that produced the results. A visitor&apos;s browser can&apos;t run the suite, so the
          demos cover the rest in the page. This page builds on{" "}
          <Link href={topicHref("strategy")} className={inline}>
            Testing strategy
          </Link>
          .
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            An end-to-end test uses the app the way a person does, in a real browser, against the real server, and checks what the person would see. It
            proves the pieces work together, at the highest cost per test.
          </>
        }
        points={[
          <>
            Playwright starts a <strong>browser</strong>, gives each test a fresh <strong>context</strong> (its own cookies and storage, like a new profile) and
            opens a <strong>page</strong> in it. Tests can&apos;t leak state into each other, so they can run in parallel.
          </>,
          <>
            Actions wait until the element is visible, stable, enabled and able to receive the click, and assertions like{" "}
            <code>toBeVisible()</code> retry until they pass or time out. Tests describe what should happen, not how long it takes.
          </>,
          <>
            The tests here set each practice&apos;s own controls (no random latency, a fixed order of replies, a fake clock for toasts) so every run makes the
            same choices. Nothing is left to chance.
          </>,
          <>
            Writing the suite found a real bug: in the multi-step form, a status line appeared under the email field between pressing and releasing Next,
            the button moved 22 px, and the press was lost. Unit tests can&apos;t see that. The line now keeps its space.
          </>,
        ]}
        demoTitle="the suite's latest run, and the code behind one result"
        demo={<ProvesDemo />}
        advice={[
          {
            do: <>Keep end-to-end tests for journeys and behaviour that need a real browser, and make every input the test depends on explicit.</>,
            avoid: <>Testing every rule at this level, or letting a test depend on what another test left behind.</>,
          },
        ]}
        links={[
          { label: "Playwright: best practices", href: `${PW}/best-practices` },
          { label: "Playwright: isolation", href: `${PW}/browser-contexts` },
          { label: "Playwright: clock", href: `${PW}/clock` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            A locator is how a test finds an element. The best ones use what the user perceives, the role and accessible name, so they keep working through
            restyling and refactors and break when the user would notice a change.
          </>
        }
        points={[
          <>
            Prefer <code>getByRole</code> with a name, then <code>getByLabel</code> for form fields and <code>getByText</code> for content. They also check
            that the element is accessible: a button with no name can&apos;t be found.
          </>,
          <>
            Use <code>getByTestId</code> when nothing user-facing is stable (a canvas, a list of identical icons), and CSS or XPath as a last resort: class names
            and DOM structure change for reasons that have nothing to do with behaviour.
          </>,
          <>
            Locators are <strong>strict</strong>: an action or assertion fails if more than one element matches. Narrow by scoping to a region (
            <code>getByRole(&quot;region&quot;, {"{"} name: &quot;Demo controls&quot; {"}"})</code>), chaining, or <code>filter</code>, not by taking the first match.
          </>,
          <>
            Role and label locators break on a translation. That&apos;s usually right for one locale&apos;s suite; for many locales, run each against its own strings
            or fall back to test ids.
          </>,
        ]}
        demoTitle="try locators against a form, then change the form"
        demo={<LocatorDemo />}
        advice={[
          {
            do: <>Find elements by role and name, scope to named regions, and add a test id only where nothing user-facing is stable.</>,
            avoid: <>Long CSS chains, <code>nth()</code> to dodge a strictness error, or selectors on generated class names.</>,
          },
        ]}
        links={[
          { label: "Playwright: locators", href: `${PW}/locators` },
          { label: "Playwright: other locators", href: `${PW}/other-locators` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Most flaky end-to-end tests are timing bugs in the test: it checks before the page is ready, or waits a fixed time that is sometimes too short and
            always too long.
          </>
        }
        points={[
          <>
            <code>waitForTimeout</code> is a guess. Replace it with an assertion that retries (<code>await expect(locator).toHaveText(...)</code>), which passes
            as soon as the page is ready and fails only when it never gets there.
          </>,
          <>
            Shared state between tests (one account, one cart, the same data) makes results depend on order. Give each test its own data, or create it in a
            fixture.
          </>,
          <>
            Animations move elements while the test clicks. Turn them off with reduced motion or the app&apos;s own setting; this suite runs with{" "}
            <code>reducedMotion: &quot;reduce&quot;</code>.
          </>,
          <>
            Time and randomness change between runs: install a fake clock and pin random choices (here, the practices&apos; latency and failure controls).
            Network the test doesn&apos;t control can be stubbed with <code>page.route</code>.
          </>,
        ]}
        demoTitle="run the same check three ways against a page of varying speed"
        demo={<WaitDemo />}
        advice={[
          {
            do: <>Wait for what the user would wait for, with retrying assertions, and make the page&apos;s timing an input of the test.</>,
            avoid: <>Sleeps, raising timeouts until it passes, or retrying a flaky test instead of finding its cause.</>,
          },
        ]}
        links={[
          { label: "Playwright: auto-waiting", href: `${PW}/actionability` },
          { label: "Playwright: assertions", href: `${PW}/test-assertions` },
          { label: "Playwright: mock APIs", href: `${PW}/mock` },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            A page object wraps one page: how to find its elements and how to do things on it. Tests then read as steps and checks, and a change to the page
            is fixed in one place.
          </>
        }
        points={[
          <>
            Put locators and page-level actions (<code>fillPersonal</code>, <code>turnEverythingOff</code>) in the page object. Keep assertions about business
            rules and the test data in the test, where a reader expects them.
          </>,
          <>
            Shared parts of the interface get a component object (here the controls panel and the toast region), which page objects reuse instead of
            repeating.
          </>,
          <>
            Fixtures build the page objects and hand them to the test, so setup (open the page, set the latency, install a clock) lives in one place and
            each test still gets a fresh browser context.
          </>,
          <>
            Page objects save the most when locators change and the least when the flow changes; avoid growing them into one method per test.
          </>,
        ]}
        demoTitle="change the page and count the lines each version must edit"
        demo={<PageObjectsDemo />}
        advice={[
          {
            do: <>One page object per page or region, small methods named after what the user does, assertions in the tests.</>,
            avoid: <>Page objects that assert, hide waits, or return other page objects for every click.</>,
          },
        ]}
        links={[
          { label: "Playwright: page object models", href: `${PW}/pom` },
          { label: "Playwright: fixtures", href: `${PW}/test-fixtures` },
          { label: "Martin Fowler: PageObject", href: "https://martinfowler.com/bliki/PageObject.html" },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            In CI the suite runs on every pull request, against a fresh build, on machines nobody watches. What makes a red build quick to fix is the evidence
            it leaves behind.
          </>
        }
        points={[
          <>
            Record a <strong>trace</strong> when a test fails or retries: it holds each action, a DOM snapshot before and after, console output and network
            requests, and opens in the trace viewer. Screenshots and videos on failure show what the page looked like.
          </>,
          <>
            Retry on CI only, and treat a test that passes on retry as <strong>flaky</strong>, not green: the reporter lists it separately, and it needs a fix.
          </>,
          <>
            Split a long suite across machines with <code>--shard</code>, run workers in parallel on each, and test the production build, not the dev
            server.
          </>,
          <>
            Beyond this suite: save a signed-in state once and reuse it (<code>storageState</code>), compare screenshots with{" "}
            <code>toHaveScreenshot</code>, and run an accessibility scan inside the journeys that matter.
          </>,
        ]}
        demoTitle="size a CI run"
        demo={<CiTopicDemo />}
        advice={[
          {
            do: <>Keep traces on the first retry, upload the report from every run, and track flaky tests until they are fixed.</>,
            avoid: <>Retrying locally, or reading only the last line of a failure instead of its trace.</>,
          },
        ]}
        links={[
          { label: "Playwright: trace viewer", href: `${PW}/trace-viewer` },
          { label: "Playwright: retries", href: `${PW}/test-retries` },
          { label: "Playwright: sharding", href: `${PW}/test-sharding` },
          { label: "Playwright: CI", href: `${PW}/ci` },
        ]}
      />

      <p className="text-sm text-foreground/85">
        Next in this section:{" "}
        <Link href={topicHref("bdd-cucumber")} className={inline}>
          behaviour-driven tests with Cucumber
        </Link>
        , which run on top of these page objects.
      </p>
    </div>
  );
}

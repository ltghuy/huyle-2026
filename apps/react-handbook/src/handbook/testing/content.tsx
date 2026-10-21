import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { ClassifyDemo } from "./classify-demo";
import { DoublesDemo } from "./doubles-demo";
import { PipelineDemo } from "./pipeline-demo";
import { ShapesDemo } from "./shapes-demo";
import { WhyTestDemo } from "./why-test-demo";

const FOWLER = "https://martinfowler.com";
const KENT = "https://kentcdodds.com/blog";

const TOPICS = [
  { id: "why-test", title: "What a test buys" },
  { id: "levels", title: "Levels and shapes of a suite" },
  { id: "choose", title: "Choosing the level for a case" },
  { id: "doubles", title: "Test doubles and what to fake" },
  { id: "where", title: "Where each check runs" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function StrategyHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          A test is a small program that runs your code and checks one thing about it. A suite is worth what it tells you: it should fail when users would
          see a bug, pass when they wouldn&apos;t, and do both quickly. This page sets up the terms the rest of the Testing section uses: the levels of
          test, the shapes a suite can take, how to pick a level for a case, what to fake, and where each check runs. The later pages build on it with{" "}
          <Link href={topicHref("e2e-playwright")} className={inline}>
            a real end-to-end suite
          </Link>
          ,{" "}
          <Link href={topicHref("bdd-cucumber")} className={inline}>
            scenarios anyone can read
          </Link>{" "}
          and{" "}
          <Link href={topicHref("ab-testing")} className={inline}>
            experiments
          </Link>
          . The sample tests in the demos really run in your browser; the suite and pipeline demos are models, with their assumptions shown.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            A test buys confidence that a change didn&apos;t break something a user relies on. It costs time to write, time to run, and time to fix
            when it fails for no good reason.
          </>
        }
        points={[
          <>
            A good test fails when behaviour that users or callers depend on changes, and passes when only the code&apos;s insides change. A test that
            misses bugs gives false comfort, and one that breaks on every refactor teaches the team to ignore red builds.
          </>,
          <>
            Tests on <strong>implementation details</strong> check which helper was called, how often or in what order. They tie the test to today&apos;s
            code, so they tend to fail on harmless refactors and pass on real bugs.
          </>,
          <>
            Tests on <strong>behaviour</strong> use the code the way its users do (a function the way its callers call it, a component the way a person
            uses it) and check the result.
          </>,
          <>Coverage tells you which lines ran, not whether anything checked them. It&apos;s useful for finding untested areas and a poor target.</>,
        ]}
        demoTitle="change the code and see which tests notice"
        demo={<WhyTestDemo />}
        advice={[
          {
            do: <>Assert on what a caller or user can observe: return values, rendered text, requests sent. Write the test that would have caught the last bug you shipped.</>,
            avoid: <>Spying on private helpers, asserting call counts no caller cares about, or raising coverage with tests that assert nothing.</>,
          },
        ]}
        links={[
          { label: "Testing Library: guiding principles", href: "https://testing-library.com/docs/guiding-principles" },
          { label: "Kent C. Dodds: testing implementation details", href: `${KENT}/testing-implementation-details` },
          { label: "Martin Fowler: test coverage", href: `${FOWLER}/bliki/TestCoverage.html` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Tests differ in how much of the real system they run. The more they run, the more they prove, and the slower, costlier and flakier they get.
          </>
        }
        points={[
          <>
            <strong>Static checks</strong> (the type checker, the linter) read the code without running it. They catch typos, wrong types and unsafe
            patterns in seconds, and nothing about behaviour.
          </>,
          <>
            <strong>Unit tests</strong> run one function or module with its collaborators replaced. They are fast and precise, and they miss bugs in how
            the pieces fit together.
          </>,
          <>
            <strong>Integration tests</strong> run several pieces together, such as a component with its hooks and state against a fake network. In a
            frontend they usually give the most confidence per second of run time.
          </>,
          <>
            <strong>End-to-end tests</strong> drive the real app in a real browser against a real or staging backend. They prove the whole path works,
            and they are the slowest, the most expensive to keep and the most likely to fail for a reason unrelated to the change.
          </>,
          <>
            Other kinds sit beside these. Visual tests compare screenshots. Contract tests check that a client and an API agree on a shape. Load tests
            check behaviour under traffic.
          </>,
          <>
            The <em>pyramid</em> puts most tests at the unit level and few end to end. The <em>trophy</em> moves the weight to integration tests and adds
            static checks as the base. The <em>ice-cream cone</em>, mostly end-to-end and manual tests, is the shape teams end up with by accident.
          </>,
        ]}
        demoTitle="change the mix and compare suites"
        demo={<ShapesDemo />}
        advice={[
          {
            do: <>Turn on static checks everywhere, cover logic with unit tests and features with integration tests, and keep a short list of end-to-end journeys that must never break.</>,
            avoid: <>Testing the same rule again at every level, or letting the end-to-end suite grow until nobody waits for it.</>,
          },
        ]}
        links={[
          { label: "Martin Fowler: the practical test pyramid", href: `${FOWLER}/articles/practical-test-pyramid.html` },
          { label: "Kent C. Dodds: the testing trophy", href: `${KENT}/the-testing-trophy-and-testing-classifications` },
          { label: "Google Testing Blog: flaky tests", href: "https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={<>The level follows from what the case depends on and what a miss would cost.</>}
        points={[
          <>Pure logic with many inputs (formatting, a reducer, validation rules) belongs in unit tests, where each extra case costs a millisecond.</>,
          <>
            Behaviour that comes from pieces working together on one screen (a form and its error messages, a search with its debounce and cache)
            belongs in integration tests, with the network faked so the test controls timing.
          </>,
          <>
            A journey across pages, real routing, cookies or the real server belongs in end-to-end tests. Keep these for the paths that would cost the
            most if they broke.
          </>,
          <>One case can need two levels: unit tests for a rule&apos;s edge cases, and one end-to-end test that proves the rule is wired in.</>,
        ]}
        demoTitle="place real cases from this site"
        demo={<ClassifyDemo />}
        advice={[
          {
            do: <>Ask whether it&apos;s pure logic, whether it crosses a network or process boundary, whether the user sees it, and how costly a miss would be.</>,
            avoid: <>Choosing the level by habit, or writing an end-to-end test for each branch of a rule that a unit test covers in milliseconds.</>,
          },
        ]}
        links={[
          { label: "Kent C. Dodds: write tests, mostly integration", href: `${KENT}/write-tests` },
          { label: "Martin Fowler: the practical test pyramid", href: `${FOWLER}/articles/practical-test-pyramid.html` },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            A test double stands in for something the code under test talks to. Where you put the double decides what the test can still catch.
          </>
        }
        points={[
          <>
            A <strong>stub</strong> returns canned answers: the search gets a fixed list of products. A <strong>spy</strong> records how it was called, so
            the test can check that one request went out for &quot;mug&quot;.
          </>,
          <>
            A <strong>mock</strong> is set up with expectations and fails the test when they aren&apos;t met, for example exactly one request with this
            query. A <strong>fake</strong> is a working, simpler implementation, such as an in-memory server that answers searches the way the real one
            does.
          </>,
          <>
            Mocking your own modules ties the test to your code&apos;s structure. Faking at the network boundary keeps your code real and replaces only
            what you don&apos;t own.
          </>,
          <>
            A hand-written reply goes stale when the API changes. A fake built from the same contract or schema as the server changes with it, and a
            contract test between the two teams keeps both honest.
          </>,
        ]}
        demoTitle="change the server's reply and see which tests notice"
        demo={<DoublesDemo />}
        advice={[
          {
            do: <>Fake what you don&apos;t own (the network, time, randomness) at the edge, and build fakes from the shared contract or schema.</>,
            avoid: <>Mocking the helpers of the module under test, or hand-writing canned replies that nobody updates when the API changes.</>,
          },
        ]}
        links={[
          { label: "Martin Fowler: mocks aren't stubs", href: `${FOWLER}/articles/mocksArentStubs.html` },
          { label: "Mock Service Worker: philosophy", href: "https://mswjs.io/docs/philosophy" },
          { label: "Martin Fowler: contract test", href: `${FOWLER}/bliki/ContractTest.html` },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            A check is most useful while the change is still in your head. Put fast checks early, and slow ones where they don&apos;t block typing or
            committing.
          </>
        }
        points={[
          <>In the editor, types and lint run as you type. Before a commit, run only what takes seconds, on the files that changed; slow hooks get skipped.</>,
          <>On the pull request, run the unit and integration suites in parallel, plus the end-to-end journeys that cover the change.</>,
          <>On the main branch and after deploy, run the full end-to-end and visual suites, and a short smoke test against production.</>,
          <>
            Track flaky tests. Retrying hides them, and a suite where red often means nothing stops being read. Quarantine a flaky test and fix it
            the same week.
          </>,
        ]}
        demoTitle="move checks between stages"
        demo={<PipelineDemo />}
        advice={[
          {
            do: <>Give each stage a time budget, run the checks for what changed first, and quarantine a test the day it flakes.</>,
            avoid: <>Running the whole end-to-end suite before every commit, or retrying failures until they pass.</>,
          },
        ]}
        links={[
          { label: "Martin Fowler: continuous integration", href: `${FOWLER}/articles/continuousIntegration.html` },
          { label: "Google Testing Blog: flaky tests", href: "https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html" },
        ]}
      />
    </div>
  );
}

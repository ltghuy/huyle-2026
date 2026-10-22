import Link from "next/link";

import { CodeTabs } from "@/handbook/e2e/code-tabs";
import { LAST_RUN, suiteFile } from "@/handbook/e2e/suite";
import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { practiceHref, topicHref } from "@/practices/catalog";

import { LivingDocs, type ScenarioResult } from "./living-docs";
import { ScenarioEditor } from "./scenario-editor";
import { readStepDefs } from "./step-defs";
import { StepLibrary } from "./step-library";
import { WorthItDemo } from "./worth-it-demo";

const FEATURES = ["e2e/features/discount-codes.feature", "e2e/features/job-application.feature"];
const STEP_FILES = ["e2e/steps/cart.steps.ts", "e2e/steps/application.steps.ts"];

const TOPICS = [
  { id: "gherkin", title: "Gherkin anyone can read" },
  { id: "steps", title: "From a sentence to the code it runs" },
  { id: "write", title: "Write a scenario" },
  { id: "good", title: "Behaviour, not clicks" },
  { id: "worth", title: "When it's worth it" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

const NEW_SCENARIOS = `Feature: Discount codes

  Scenario: Removing the code brings the full price back
    Given my cart has 2 "Blue notebook"
    And I apply the code "SAVE10"
    When I remove the discount code
    Then the total is "$22.00"

  Scenario Outline: <code> is turned down for a small cart
    Given my cart has 1 "Blue notebook"
    When I apply the code "<code>"
    Then I am told "<message>"

    Examples:
      | code   | message                        |
      | BULK15 | BULK15 needs at least 5 items. |
      | HELLO  | “HELLO” isn't a valid code.    |
`;

const IMPERATIVE = `Feature: Discount codes

  Scenario: Apply a discount
    Given I open "/react-practices/context-reducer"
    And I click the button "Add Blue notebook to cart"
    And I type "2" in the field "Quantity of Blue notebook"
    When I type "SAVE10" in the field "Discount code"
    And I click the button "Apply"
    Then the element ".total" has the text "$20.30"
`;

const DECLARATIVE = `Feature: Discount codes

  Scenario: SAVE10 takes 10% off
    Given my cart has 2 "Blue notebook"
    When I apply the code "SAVE10"
    Then the total is "$20.30"
`;

const CUCUMBER = "https://cucumber.io/docs";
const BDD = "https://vitalets.github.io/playwright-bdd/#";

export function BddHandbook() {
  const features = FEATURES.map((path) => ({ path, text: suiteFile(path) ?? "" }));
  const defs = readStepDefs(Object.fromEntries(STEP_FILES.map((f) => [f, suiteFile(f)])));
  const results: ScenarioResult[] = (LAST_RUN?.tests ?? [])
    .filter((t) => t.file.endsWith(".feature"))
    .map((t) => ({ feature: t.describe.split(" › ")[0], title: t.title, outcome: t.outcome, durationMs: t.durationMs }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          Behaviour-driven development writes examples of a rule in plain sentences (Given a situation, When something happens, Then this is the
          result), agrees on them with the people who own the rule, and runs the same sentences as tests. This repo has two feature files written that way,
          for the{" "}
          <Link href={practiceHref("context-reducer")} className={inline}>
            shopping cart&apos;s discount codes
          </Link>{" "}
          and the{" "}
          <Link href={practiceHref("multi-step-form")} className={inline}>
            job application form
          </Link>
          . They run inside the{" "}
          <Link href={topicHref("e2e-playwright")} className={inline}>
            end-to-end suite
          </Link>{" "}
          with <code className="font-mono text-sm">pnpm test:e2e</code>: playwright-bdd turns each scenario into a Playwright test, and its steps drive the
          same page objects. Everything below reads the files and results of the latest recorded run, and the checker uses the same Gherkin parser and step
          matcher as the suite.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            A feature file is a document first: a product owner should be able to read it, recognise the rule and say whether an example is wrong. Running it
            is what keeps that document true.
          </>
        }
        points={[
          <>
            A <strong>Feature</strong> names the capability and says why it exists. A <strong>Rule</strong> groups the examples of one business rule. A{" "}
            <strong>Background</strong> holds the steps every scenario starts with.
          </>,
          <>
            A <strong>Scenario</strong> is one example: <strong>Given</strong> sets up the situation, <strong>When</strong> is the one thing that happens,
            and <strong>Then</strong> is what the user should see. <strong>And</strong> and <strong>But</strong> continue the previous kind of step.
          </>,
          <>
            A <strong>Scenario Outline</strong> runs the same steps once per row of its <strong>Examples</strong> table, so the discount codes are three rows,
            not three copies.
          </>,
          <>
            <strong>Tags</strong> such as <code>@smoke</code> or <code>@cart</code> select scenarios to run (<code>--grep @smoke</code>) and filter the
            documentation.
          </>,
        ]}
        demoTitle="the repo's features as documentation, with the latest results"
        demo={<LivingDocs features={features} results={results} ranAt={LAST_RUN?.ranAt ?? null} defs={defs} />}
        advice={[
          {
            do: <>Write the feature description for the reader who owns the rule, and keep one rule per Rule block with a few telling examples.</>,
            avoid: <>A feature file that only engineers open, or an examples table that lists every case a unit test should cover.</>,
          },
        ]}
        links={[
          { label: "Cucumber: Gherkin reference", href: `${CUCUMBER}/gherkin/reference/` },
          { label: "Cucumber: living documentation", href: `${CUCUMBER}/bdd/` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Each step sentence is matched to a step definition: a pattern and the code it runs. The code should be short, because the page object already
            knows how to find and drive the page.
          </>
        }
        points={[
          <>
            Patterns are Cucumber expressions: <code>{"{int}"}</code> and <code>{"{string}"}</code> capture values from the sentence and pass them to the
            code, so &quot;my cart has 2 &quot;Blue notebook&quot;&quot; becomes <code>add(&quot;Blue notebook&quot;, 2)</code>.
          </>,
          <>
            A sentence must match exactly one definition. Two that match the same text make the step ambiguous and the runner refuses it; none makes it
            undefined.
          </>,
          <>
            Steps of one scenario share state through fixtures (here, the page object each fixture opens). Each scenario gets fresh fixtures and a fresh
            browser context, so nothing leaks into the next one.
          </>,
          <>Reuse steps by wording them the same way. A step library that grows a new sentence for every scenario is the first sign of trouble.</>,
        ]}
        demoTitle="see which steps the suite defines and where each is used"
        demo={<StepLibrary defs={defs} features={features} />}
        advice={[
          {
            do: <>Keep step definitions one or two lines over page objects, with parameters for the values that change.</>,
            avoid: <>Finding elements inside steps, near-duplicate sentences, or regular expressions nobody can read.</>,
          },
        ]}
        links={[
          { label: "Cucumber expressions", href: "https://github.com/cucumber/cucumber-expressions#readme" },
          { label: "playwright-bdd: writing steps", href: `${BDD}/writing-steps/index` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Writing a scenario starts from steps that already exist. A new sentence is fine when the behaviour is new, and the runner tells you what code it
            needs.
          </>
        }
        points={[
          <>The checker parses your text as you type and points to the line of any syntax problem.</>,
          <>An outline is expanded into one scenario per examples row, the way the runner sees it.</>,
          <>
            Every step is matched against the suite&apos;s real step definitions: matched with the values it captures, undefined with a suggested
            definition to write, or ambiguous with the definitions that clash.
          </>,
        ]}
        demoTitle="edit a feature and see each step checked"
        demo={<ScenarioEditor storageKey="rp.bdd.write" initial={NEW_SCENARIOS} defs={defs} />}
        advice={[
          {
            do: <>Write the scenario with the person who owns the rule, reuse existing steps, and add a definition only for new behaviour.</>,
            avoid: <>Copying a step with one word changed, or writing scenarios after the code to raise the count.</>,
          },
        ]}
        links={[{ label: "playwright-bdd: writing features", href: `${BDD}/writing-features/index` }]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            The most common way this goes wrong is a scenario that lists clicks. It reads like a script, breaks on every redesign and tells the product owner
            nothing about the rule.
          </>
        }
        points={[
          <>
            <strong>Imperative</strong> scenarios name buttons, fields and pages. <strong>Declarative</strong> ones say what the user wants and leave how to
            the step definitions.
          </>,
          <>One scenario, one behaviour: a single When. Setup goes into Given steps or the Background.</>,
          <>Then steps check what the user sees. A database row or a request body is an internal detail and belongs in a lower-level test.</>,
          <>
            A pure calculation (the discount rate, the rounding) is better tested as a unit with many inputs; the scenario proves the rule is wired in and
            shows a reader one example.
          </>,
        ]}
        demoTitle="check a scenario for click-by-click steps"
        demo={<ScenarioEditor storageKey="rp.bdd.good" initial={IMPERATIVE} alternatives={[{ label: "Show the declarative version", text: DECLARATIVE }]} defs={defs} lint />}
        advice={[
          {
            do: <>Describe the intent in the user&apos;s words and keep each scenario to a handful of steps.</>,
            avoid: <>Steps like &quot;I click the button&quot;, selectors in sentences, or checks the user can&apos;t see.</>,
          },
        ]}
        links={[
          { label: "Cucumber: better Gherkin", href: `${CUCUMBER}/bdd/better-gherkin/` },
          { label: "Cucumber: anti-patterns", href: `${CUCUMBER}/guides/anti-patterns/` },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            The value of the format is in the conversation before the code. A team that writes scenarios alone, after the fact, pays for the layer and gets
            nothing back.
          </>
        }
        points={[
          <>
            Discovery comes first: a product owner, a developer and a tester (the &quot;three amigos&quot;) talk through a rule with concrete examples, and
            the examples they agree on become scenarios.
          </>,
          <>
            The people who own the rule read and review the scenarios; engineers write the step definitions. If nobody outside engineering reads them, plain
            end-to-end tests with clear names do the same job with less code.
          </>,
          <>
            Warning signs: scenarios that mirror the interface, a step library nobody curates, and features written after the code to match what it does.
          </>,
        ]}
        demoTitle="check whether it fits your team"
        demo={<WorthItDemo />}
        advice={[
          {
            do: <>Use it where rules are discussed with people outside engineering, starting with the riskiest rules.</>,
            avoid: <>Adopting it for every test, or as a way to let non-developers write automation on their own.</>,
          },
        ]}
        links={[
          { label: "Cucumber: discovery", href: `${CUCUMBER}/bdd/discovery-workshop/` },
          { label: "Cucumber: who does what", href: `${CUCUMBER}/bdd/who-does-what/` },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">The step files, as recorded</h2>
        <CodeTabs label="Step files" files={STEP_FILES.map((f) => ({ path: f, code: suiteFile(f) }))} />
      </div>
    </div>
  );
}

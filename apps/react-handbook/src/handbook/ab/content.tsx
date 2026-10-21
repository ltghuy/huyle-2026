import Link from "next/link";

import { CodeBlock } from "@/handbook/e2e/code-block";
import { OUTCOME_LABEL, recordedTest, suiteFile } from "@/handbook/e2e/suite";
import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { FlickerDemo } from "./flicker-demo";
import { type Assignment, LiveExperiment } from "./live-experiment";
import { PeekingDemo } from "./peeking-demo";
import { PlanDemo } from "./plan-demo";
import { SampleSizeDemo } from "./sample-size-demo";
import { SpreadDemo } from "./spread-demo";
import { SrmDemo } from "./srm-demo";

const TOPICS = [
  { id: "anatomy", title: "What an experiment needs" },
  { id: "split", title: "A real, sticky split" },
  { id: "sample-size", title: "Sample size and significance" },
  { id: "peeking", title: "Looking early" },
  { id: "pitfalls", title: "Checks before you trust a result" },
] as const;

const SPEC = "e2e/specs/ab-testing.spec.ts";

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

function SplitDemos({ assignment }: { assignment: Assignment }) {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <LiveExperiment initial={assignment} />
      <div className="flex min-w-0 flex-col gap-2">
        <h4 className="text-sm font-medium">Browser assignment and the flash of the wrong variant</h4>
        <FlickerDemo />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <h4 className="text-sm font-medium">Is the hash fair?</h4>
        <SpreadDemo />
      </div>
    </div>
  );
}

function PitfallsDemo() {
  const pinned = recordedTest(SPEC, 'variant B renders "Buy now"');
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <SrmDemo />
      <div className="flex min-w-0 flex-col gap-2">
        <h4 className="text-sm font-medium">Experiments in the end-to-end suite</h4>
        <p className="text-sm text-foreground/85">
          The suite pins each variant with a cookie instead of getting a random one, so every run checks the same pages; the third test checks that an
          id survives a reload.{" "}
          {pinned ? `In the latest recorded run the variant B test ${OUTCOME_LABEL[pinned.outcome].toLowerCase()}.` : "This test has no recorded result yet."}
        </p>
        <CodeBlock path={SPEC} code={suiteFile(SPEC)} />
      </div>
    </div>
  );
}

export function AbHandbook({ assignment }: { assignment: Assignment }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          The other Testing pages check that the code does what the team meant. An A/B test checks whether what the team meant is any good: it shows
          different versions to different visitors and measures which one moves a metric. You are in a real experiment on this page right now, assigned by
          the server before the page reached you. The statistics topics use simulations that draw random visitors in your browser, because one visitor&apos;s
          page can&apos;t show a whole experiment&apos;s results. It builds on{" "}
          <Link href={topicHref("strategy")} className={inline}>
            Testing strategy
          </Link>{" "}
          and{" "}
          <Link href={topicHref("e2e-playwright")} className={inline}>
            the end-to-end suite
          </Link>
          .
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={<>Most failed experiments were decided before any code: a vague hypothesis, a metric the change can&apos;t move, or nothing watching for harm.</>}
        points={[
          <>
            A <strong>hypothesis</strong> says what will change and why. The &quot;why&quot; is what you learn when the result comes back, whichever way it
            goes.
          </>,
          <>
            The <strong>primary metric</strong> decides the test; a <strong>guardrail</strong> must not get worse (refunds, speed, errors). Pick both before
            starting, or you&apos;ll find a metric that happens to look good.
          </>,
          <>
            The <strong>unit of assignment</strong> (visitor, session, page view) should match the metric. Per-visitor metrics need per-visitor assignment, or
            one person sees both versions.
          </>,
          <>A smaller share of traffic is safer for a risky change and makes the test proportionally longer.</>,
        ]}
        demoTitle="write a plan and see its gaps"
        demo={<PlanDemo />}
        advice={[
          {
            do: <>Write the hypothesis, the primary metric, a guardrail and the sample size down before the test starts.</>,
            avoid: <>Testing many changes at once, or choosing the metric after looking at the results.</>,
          },
        ]}
        links={[
          { label: "Kohavi et al.: online controlled experiments", href: "https://exp-platform.com/Documents/GuideControlledExperiments.pdf" },
          { label: "Kohavi, Tang and Xu: Trustworthy Online Controlled Experiments", href: "https://experimentguide.com/" },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Assignment is the frontend&apos;s main job in an experiment: every visitor gets one variant, keeps it, and sees it from the first paint.
          </>
        }
        points={[
          <>
            Assignment is <strong>deterministic</strong>: hash the experiment name and the visitor&apos;s id into one of 10,000 buckets, and give a range of
            buckets to each variant. The same id always lands in the same bucket, so no list of visitors is needed.
          </>,
          <>
            The id lives in the visitor&apos;s browser (a cookie). Including the experiment name in the hash gives each experiment its own shuffle, so the same
            people aren&apos;t always in B.
          </>,
          <>
            Assigning on the <strong>server</strong> or at the <strong>edge</strong> puts the variant in the first HTML. Assigning in the{" "}
            <strong>browser</strong> needs a flag request first, so the page paints the default and then swaps it.
          </>,
          <>
            Changing the split moves the visitors whose buckets cross the line. Only ever grow a variant&apos;s range, and start a new experiment (new name, new
            shuffle) rather than reusing one.
          </>,
        ]}
        demoTitle="your assignment, the flash of the wrong variant, and the spread of many ids"
        demo={<SplitDemos assignment={assignment} />}
        advice={[
          {
            do: <>Assign on the server or at the edge, from a stable id and the experiment name, and log an exposure only when the variant is actually shown.</>,
            avoid: <>Random assignment on every page view, hiding the page until a flag arrives, or logging exposure for visitors who never saw the change.</>,
          },
        ]}
        links={[
          { label: "Next.js: cookies", href: "https://nextjs.org/docs/app/api-reference/functions/cookies" },
          { label: "Martin Fowler: feature toggles", href: "https://martinfowler.com/articles/feature-toggles.html" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Small effects hide in noise. How many visitors you need depends on the baseline rate, the smallest effect worth finding, and how sure you want to be.
          </>
        }
        points={[
          <>
            The <strong>significance level</strong> (often 5%) is the false positive rate you accept: how often an A/A test would still call a winner.{" "}
            <strong>Power</strong> (often 80%) is the chance of finding a real effect of the size you planned for.
          </>,
          <>Halving the effect you want to find needs about four times the visitors; a low baseline rate needs more too.</>,
          <>
            The <strong>p-value</strong> is how surprising the data would be if there were no difference. It is not the chance that B is better, and a
            &quot;significant&quot; lift is usually an overestimate of the true one.
          </>,
          <>Decide the sample size first and run the test to it, including whole weeks so weekday and weekend visitors are both in.</>,
        ]}
        demoTitle="size a test, then simulate it"
        demo={<SampleSizeDemo />}
        advice={[
          {
            do: <>Size the test for the smallest effect that would change your decision, and report the interval, not just the p-value.</>,
            avoid: <>Running until the result looks good, or reading &quot;p &lt; 0.05&quot; as &quot;95% sure B wins&quot;.</>,
          },
        ]}
        links={[
          { label: "Evan Miller: sample size calculator", href: "https://www.evanmiller.org/ab-testing/sample-size.html" },
          { label: "ASA statement on p-values", href: "https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf" },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            Checking the dashboard every day and stopping at the first significant result feels efficient. It turns a 5% false positive rate into something much
            larger.
          </>
        }
        points={[
          <>Each look is another chance for noise to cross the line. The p-value wanders up and down during a test, so stopping when it dips picks the luckiest moment.</>,
          <>The fix is either to decide the sample size up front and look once at the end, or to use a method built for continuous monitoring.</>,
          <>
            Sequential tests and always-valid p-values let you look as often as you like by demanding stronger evidence early; many experimentation platforms
            use them.
          </>,
        ]}
        demoTitle="run many A/A tests and peek at each one"
        demo={<PeekingDemo />}
        advice={[
          {
            do: <>Fix the stopping rule before the test starts, and use a sequential method if decisions really must be made early.</>,
            avoid: <>Stopping at the first significant day, or extending a test because it is &quot;almost significant&quot;.</>,
          },
        ]}
        links={[
          { label: "Evan Miller: how not to run an A/B test", href: "https://www.evanmiller.org/how-not-to-run-an-ab-test.html" },
          { label: "Johari et al.: always valid inference", href: "https://arxiv.org/abs/1512.04922" },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={<>A result is only as good as the data under it. Check the experiment before reading the metric.</>}
        points={[
          <>
            <strong>Sample ratio mismatch</strong>: if the variants didn&apos;t get the share of visitors they were meant to, something is dropping or adding
            visitors in one of them, and the comparison is broken.
          </>,
          <>
            The <strong>novelty effect</strong> makes a change look good (or bad) while it is new; check how the effect develops over the weeks. Testing{" "}
            <strong>many metrics</strong> at once guarantees some &quot;significant&quot; ones by chance.
          </>,
          <>
            Experiments running at the same time can <strong>interact</strong>; the variant&apos;s code has a <strong>performance cost</strong> of its own; and the
            losing variant and its flag should be <strong>removed</strong> once the decision is made.
          </>,
          <>
            Beyond fixed tests: sequential and Bayesian methods, multi-armed bandits that shift traffic to the better variant, feature flags for releases
            that aren&apos;t experiments, and holdouts that measure a whole quarter of changes.
          </>,
        ]}
        demoTitle="check a split for sample ratio mismatch, and see how the suite pins variants"
        demo={<PitfallsDemo />}
        advice={[
          {
            do: <>Run a sample ratio check on every experiment, pre-register the metrics, and pin variants in automated tests.</>,
            avoid: <>Reading the result of an experiment whose split is off, or leaving dead variants and flags in the code.</>,
          },
        ]}
        links={[
          { label: "Fabijan et al.: sample ratio mismatch", href: "https://exp-platform.com/Documents/2019_KDDFabijanGupchupFuptaOmhoverVermeerDmitriev.pdf" },
          { label: "Microsoft: experimentation pitfalls", href: "https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/" },
        ]}
      />
    </div>
  );
}

import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { FrameworkDemo } from "./framework-demo";
import { RequirementsDemo } from "./requirements-demo";
import { TradeoffsDemo } from "./tradeoffs-demo";

const GFE = "https://www.greatfrontend.com/front-end-system-design-playbook";
const MDN = "https://developer.mozilla.org/en-US/docs";
const WEBDEV = "https://web.dev";

const TOPICS = [
  { id: "framework", title: "A framework for any prompt" },
  { id: "requirements", title: "Requirements and scoping" },
  { id: "tradeoffs", title: "Trade-offs and non-functionals" },
] as const;

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function DesignMethodHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-3 text-foreground/85">
        <p>
          A frontend system-design prompt, such as &quot;design a news feed&quot; or &quot;design autocomplete&quot;, is open-ended on purpose.
          What is being tested is whether you can <strong>run the design</strong>: scope it, structure it, and defend your choices out loud,
          in order. The case studies in the rest of this section all apply the method described here. Because the method is a way of
          thinking, its demos are interactive references rather than server labs, and each worked example is one possible answer.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            Run every prompt through the same ordered stages. The order matters: each stage&apos;s output feeds the next, and skipping
            ahead (naming components before you&apos;ve scoped, say) is the most common way a design goes wrong.
          </>
        }
        points={[
          <>
            <strong>Clarify requirements</strong> → <strong>architecture</strong> → <strong>data model</strong> → <strong>interface &amp; data flow</strong> → <strong>deep dives</strong> → <strong>trade-offs</strong>. (A common shorthand is <em>RADIO</em>.)
          </>,
          <>Budget your time: spend the first fifth scoping and the middle on architecture and interface, and leave room to go deep on the one or two hard parts instead of covering everything shallowly.</>,
          <>Think aloud and drive: state assumptions, write down what&apos;s out of scope, and lead the discussion through the stages instead of waiting to be asked.</>,
          <>Step the framework through a sample product in the demo to see how each stage lands differently for a feed, a typeahead, a chat app or a design system.</>,
        ]}
        demoTitle="step the framework through a product"
        demo={<FrameworkDemo />}
        advice={[
          {
            do: <>Follow the stages in order, timebox them, and go deep where the problem is hard.</>,
            avoid: <>Jumping to components or libraries before requirements, or spreading equally thin across every stage.</>,
          },
        ]}
        links={[
          { label: "GreatFrontEnd: system design playbook", href: GFE },
          { label: "web.dev: Learn", href: `${WEBDEV}/learn` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Scoping is what separates senior candidates from mid-level ones. Before any design, split what the product <em>does</em> (functional) from how
            well it must do it (non-functional), and say out loud what you are <em>not</em> building.
          </>
        }
        points={[
          <><strong>Functional requirements</strong> are the user-visible flows that must work. Keep the first pass small and prioritised: a working core is worth more than a broad sketch.</>,
          <><strong>Non-functional requirements</strong> (performance, accessibility, offline, internationalisation, security, device and network) usually decide the architecture more than the feature list does.</>,
          <>Scope cuts are requirements too. &quot;Out of scope: real-time, admin, i18n&quot; is a design decision, and stating it shows judgement and buys time for the hard parts.</>,
          <>The same prompt is a different build under different constraints: an offline-first feed, an SEO-critical feed and a watch feed share almost no architecture.</>,
        ]}
        demoTitle="scope a sample product"
        demo={<RequirementsDemo />}
        advice={[
          {
            do: <>Ask clarifying questions first, write functional and non-functional lists, and name explicit scope cuts.</>,
            avoid: <>Assuming the prompt&apos;s scale and audience, or treating accessibility and performance as afterthoughts.</>,
          },
        ]}
        links={[
          { label: "web.dev: Core Web Vitals", href: `${WEBDEV}/articles/vitals` },
          { label: "MDN: Accessibility", href: `${MDN}/Web/Accessibility` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Most of the design is a handful of recurring decisions. There is rarely a single right answer. A senior candidate names
            the options, ties each to the non-functional bar it serves, and says which they&apos;d pick and why.
          </>
        }
        points={[
          <><strong>Rendering strategy</strong> (CSR / SSR / SSG / streaming) trades first paint, SEO and freshness against complexity and cost.</>,
          <><strong>Data fetching &amp; caching</strong>, <strong>pagination</strong>, and <strong>state location</strong> each have a small menu of options with clear forces picking between them.</>,
          <><strong>Realtime transport</strong> (polling / SSE / WebSocket) follows from how live the data must be and what you can operate.</>,
          <>Every decision should trace back to a requirement: you choose cursor pagination because the feed shifts. Explore each decision&apos;s options in the demo.</>,
        ]}
        demoTitle="compare the options for a decision"
        demo={<TradeoffsDemo />}
        advice={[
          {
            do: <>Tie each choice to the requirement it serves, state your assumption, and name the alternative you&apos;d switch to if it changed.</>,
            avoid: <>Declaring one option &quot;best&quot; with no context, or optimising something that isn&apos;t the bottleneck.</>,
          },
        ]}
        links={[
          { label: "web.dev: Rendering on the web", href: `${WEBDEV}/articles/rendering-on-the-web` },
          { label: "GreatFrontEnd: system design playbook", href: GFE },
        ]}
      />

      <div className="rounded-xl border bg-muted/40 p-4 text-sm text-foreground/85">
        <p>
          <strong>Next:</strong> the case-study pages apply this method to concrete prompts. The first,{" "}
          <Link href={topicHref("news-feed")} className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Design a news feed
          </Link>
          , picks up where this framework&apos;s worked example leaves off, followed by{" "}
          <Link href={topicHref("autocomplete")} className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Design an autocomplete
          </Link>
          ,{" "}
          <Link href={topicHref("monorepo")} className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Design a frontend monorepo
          </Link>
          , which applies it to the codebase rather than a screen, and{" "}
          <Link href={topicHref("micro-frontends")} className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Design micro frontends
          </Link>
          , which applies it to how several teams release one product.
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { practiceHref, topicHref } from "@/practices/catalog";

import { AutocompleteArchitecture } from "./autocomplete-architecture";
import { ComboboxDemo } from "./combobox-demo";
import { PRODUCTS } from "./framework";
import { LifecycleDemo } from "./lifecycle-demo";

const WAI = "https://www.w3.org/WAI/ARIA/apg/patterns/combobox";
const MDN = "https://developer.mozilla.org/en-US/docs";

const AC = PRODUCTS.find((p) => p.id === "autocomplete")!;

const TOPICS = [
  { id: "requirements", title: "Requirements and architecture" },
  { id: "lifecycle", title: "The request lifecycle" },
  { id: "deep-dives", title: "Deep dives: accessibility and ranking" },
] as const;

const inline = "rounded-sm font-medium text-link underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function AutocompleteHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          &quot;Design an autocomplete&quot; sounds like a small prompt, but suggesting results as the user types involves the decisions
          senior interviews probe: debouncing, cancelling stale requests, dropping out-of-order responses, caching, and the full accessible
          combobox keyboard pattern. This page runs the prompt through{" "}
          <Link href={topicHref("method")} className={inline}>
            the design method
          </Link>{" "}
          and links the built{" "}
          <Link href={practiceHref("debounced-search")} className={inline}>
            debounced-search
          </Link>{" "}
          practice as the lifecycle implementation; the demos here show the race condition and the keyboard pattern.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={<>Scope it first, then sketch the small set of pieces: an input, a results list, and a query engine with a cache in front of a suggestion source.</>}
        points={[
          <>
            <strong>Functional:</strong> {AC.functional.join("; ").toLowerCase()}.
          </>,
          <>
            <strong>Non-functional:</strong> suggestions within ~100ms of a pause, no jank per keystroke, the latest keystroke&apos;s results always win, and a full keyboard/screen-reader experience.
          </>,
          <>
            <strong>Scope cuts:</strong> fix the corpus size and where it lives, pick prefix or fuzzy matching, and decide how many suggestions. Each of these changes the design.
          </>,
          <>
            <strong>Architecture:</strong> keep a query engine between the input and the network so debounce, caching and the latest-request guard live in one place. An alternative pushes matching to an edge search index close to users.
          </>,
        ]}
        demoTitle="the autocomplete's architecture"
        demo={<AutocompleteArchitecture />}
        advice={[
          {
            do: <>Put a query engine between input and network; decide corpus location and match type up front.</>,
            avoid: <>Calling the network straight from the input&apos;s change handler with no debounce, cache or guard.</>,
          },
        ]}
        links={[
          { label: "The design method", href: topicHref("method") },
          { label: "Debounced Search practice", href: practiceHref("debounced-search") },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            The classic autocomplete bug is a <strong>race</strong>: you type, several requests are in flight, and a slow earlier one
            resolves <em>after</em> a fast later one, so the box shows results for a query the user has already moved past. Three
            habits fix the lifecycle.
          </>
        }
        points={[
          <>
            Debounce so a burst of keystrokes issues one request, not one per character.
          </>,
          <>
            Drop out-of-order responses: tag each request and let only the latest one update the UI (cancel the rest where you can).
          </>,
          <>
            Cache by the normalised query, so a repeat query (including backspacing to a previous one) is served instantly with no request.
          </>,
          <>Run the demo with the guard off to see stale results win, then on; toggle debounce to watch the request count change.</>,
        ]}
        demoTitle="debounce, cancel, and the out-of-order race"
        demo={<LifecycleDemo />}
        advice={[
          {
            do: <>Debounce, tag requests and apply only the latest, and cache by the normalised query.</>,
            avoid: <>Trusting response arrival order, or relying on cancellation alone for correctness (treat it as an optimisation).</>,
          },
        ]}
        links={[
          { label: "Debounced Search + API Cache", href: practiceHref("debounced-search") },
          { label: "MDN: AbortController", href: `${MDN}/Web/API/AbortController` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Autocomplete is a keyboard-first control a screen reader must narrate. Getting the <strong>combobox pattern</strong> right is a
            senior expectation; ranking and highlighting are the finishing touches.
          </>
        }
        points={[
          <>
            In the combobox pattern, a <code>role=&quot;combobox&quot;</code> input exposes <code>aria-expanded</code>, <code>aria-controls</code> and <code>aria-activedescendant</code>; the popup is a <code>role=&quot;listbox&quot;</code> of <code>role=&quot;option&quot;</code> items. Arrow keys move the active option (wrapping), Enter selects, Escape closes, and focus stays in the input throughout.
          </>,
          <>
            Highlight the match so users see why each suggestion appeared, and keep the list short.
          </>,
          <>
            Ranking decides the order: prefix matches before substring, shorter before longer, popularity if you have it. Prefix matching is cheap and predictable; fuzzy matching finds more but can surprise users. Heavier ranking belongs on the server. Name the trade-off rather than claiming one is best.
          </>,
          <>The request lifecycle above is implemented in the{" "}
            <Link href={practiceHref("debounced-search")} className={inline}>
              debounced-search
            </Link>{" "}
            practice; the combobox below is the accessible shell around it.
          </>,
        ]}
        demoTitle="an accessible combobox"
        demo={<ComboboxDemo />}
        advice={[
          {
            do: <>Implement the full combobox ARIA pattern and keyboard model; highlight matches; rank prefix-first.</>,
            avoid: <>A div soup with no roles, swallowing Escape/Enter, or moving DOM focus into the option list.</>,
          },
        ]}
        links={[
          { label: "WAI-ARIA: combobox pattern", href: WAI },
          { label: "MDN: ARIA combobox role", href: `${MDN}/Web/Accessibility/ARIA/Reference/Roles/combobox_role` },
        ]}
      />

      <div className="rounded-xl border bg-muted/40 p-4 text-sm text-foreground/85">
        <p>
          <strong>Next case studies:</strong>{" "}
          <Link href={topicHref("monorepo")} className={inline}>
            Design a frontend monorepo
          </Link>
          , the same method applied to the codebase that several apps share instead of to a screen, and{" "}
          <Link href={topicHref("micro-frontends")} className={inline}>
            Design micro frontends
          </Link>
          , applied to how several teams release one product.
        </p>
      </div>
    </div>
  );
}

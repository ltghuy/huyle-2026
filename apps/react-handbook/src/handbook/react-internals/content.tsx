import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { practiceHref, topicHref } from "@/practices/catalog";

import { ElementsDemo } from "./elements-demo";
import { FibersDemo } from "./fibers-demo";
import { PhasesDemo } from "./phases-demo";
import { ReconcileDemo } from "./reconcile-demo";
import { SchedulingDemo } from "./scheduling-demo";

const TOPICS = [
  { id: "elements", title: "What JSX becomes: elements" },
  { id: "fibers", title: "Elements, fibers and the DOM" },
  { id: "reconciliation", title: "Reconciliation and keys" },
  { id: "phases", title: "Render and commit" },
  { id: "scheduling", title: "Urgent and deferred updates" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function ReactInternalsHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-3 text-foreground/85">
        <p>
          <Link href={topicHref("transpiling")} className={inline}>
            Transpiling
          </Link>{" "}
          left JSX as calls to <code className="font-mono text-[0.9em]">jsx()</code>. This page follows those calls into React: the objects they return, the fiber
          tree React keeps for them, how it works out what changed, the order in which it runs your code and touches the DOM, and how it schedules work so input
          stays responsive.
        </p>
        <p>
          Every demo runs the React this site ships (19.2, its production build) and reports what it did. Where a demo reads React&apos;s internal
          fields, it says so: they are useful for learning and never for application code.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            <code>jsx(type, props, key)</code> does almost nothing: it returns a small, plain object called a <strong>React element</strong>, a description of what
            you want on screen. Nothing is rendered, and no component runs, until React is given that object.
          </>
        }
        points={[
          <>
            An element is <code>{"{ $$typeof, type, key, ref, props }"}</code>. <code>$$typeof</code> is the symbol <code>react.transitional.element</code>, which
            React checks so that JSON from a server can&apos;t pass itself off as an element (a defence against injection).
          </>,
          <>
            <code>type</code> is a string for DOM elements (<code>&quot;ul&quot;</code>) and the function itself for components. Writing{" "}
            <code>&lt;Badge /&gt;</code> doesn&apos;t call <code>Badge</code>; React calls it later, when it renders.
          </>,
          <>
            Children live in <code>props.children</code>. The key is kept outside props (stringified), which is why a component can&apos;t read its own{" "}
            <code>key</code>.
          </>,
          <>
            Elements are immutable snapshots: every render creates new ones, and React compares them with the previous ones to decide what to change.
          </>,
        ]}
        demoTitle="write JSX and see the real objects"
        demo={<ElementsDemo />}
        advice={[
          {
            do: "Think of JSX as data: you can store elements in variables, arrays and props, and pass them around.",
            avoid: <>Calling components as functions (<code>Badge(props)</code>) instead of rendering them: React no longer sees a component, so its hooks belong to the caller.</>,
          },
        ]}
        links={[
          { label: "React: Your UI as a tree", href: "https://react.dev/learn/understanding-your-ui-as-a-tree" },
          { label: "React: createElement", href: "https://react.dev/reference/react/createElement" },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Elements are thrown away after every render, so they can&apos;t hold state. For that React keeps a <strong>fiber</strong> for each component and DOM
            node: a long-lived object that records its type and key, its props, its state, and links to its parent, first child and next sibling.
          </>
        }
        points={[
          <>
            A function component&apos;s hooks are a linked list on its fiber, in call order. That is why hooks must run in the same order every render: React finds
            each hook&apos;s state by its position in that list.
          </>,
          <>
            React keeps two copies of the tree. The <em>current</em> one matches the screen; a render builds the next version in the other copy (the
            work-in-progress), and committing swaps them. Copies are reused, so renders don&apos;t allocate a whole new tree.
          </>,
          <>
            Because a render only builds the hidden copy, React can pause it, throw it away or restart it without the screen ever showing a half-finished state.
          </>,
          <>
            Each DOM element points back to its fiber, which is how React DevTools shows component names for what you hover.
          </>,
        ]}
        demoTitle="change the counters and watch the fiber tree"
        demo={<FibersDemo />}
        advice={[
          {
            do: "Keep hooks at the top level of components, unconditionally, so their order never changes.",
            avoid: "Reading __react* properties in application code: they are internal and change between React versions.",
          },
        ]}
        links={[
          { label: "React: Rules of Hooks", href: "https://react.dev/reference/rules/rules-of-hooks" },
          { label: "React: Preserving and resetting state", href: "https://react.dev/learn/preserving-and-resetting-state" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Comparing two trees in general is expensive, so React uses two cheap rules instead. Elements of a <strong>different type</strong> produce different
            trees, and among siblings, the <strong>key</strong> says which element is which.
          </>
        }
        points={[
          <>
            Same type in the same position: React keeps the DOM node and the component&apos;s state, and only updates changed attributes and text.
          </>,
          <>
            Different type (even <code>&lt;div&gt;</code> to <code>&lt;section&gt;</code> with identical children): the old subtree is unmounted, DOM and state
            included, and a new one is mounted.
          </>,
          <>
            Without real keys, list items are matched by position. Insert at the top and React updates every row instead of inserting one, and each row&apos;s state
            stays at its old position, now under the wrong item.
          </>,
          <>
            A key is also a reset button: changing a component&apos;s key makes React treat it as a new component with fresh state.
          </>,
        ]}
        demoTitle="apply a change and read the DOM operations"
        demo={<ReconcileDemo />}
        advice={[
          {
            do: "Key list items by a stable id from your data.",
            avoid: (
              <>
                Index keys in lists that can be reordered, filtered or inserted into, and random keys (<code>Math.random()</code>) that remount every row on every
                render.
              </>
            ),
          },
        ]}
        links={[
          { label: "React: Rendering lists", href: "https://react.dev/learn/rendering-lists" },
          { label: "Legacy React docs: Reconciliation", href: "https://legacy.reactjs.org/docs/reconciliation.html" },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            An update happens in two phases. In the <strong>render</strong> phase React calls your components to get new elements and works out the changes; nothing
            touches the screen and the work can be interrupted. In the <strong>commit</strong> phase it applies the changes to the DOM in one go, then runs effects.
          </>
        }
        points={[
          <>
            Render runs parent first (a parent&apos;s output decides its children). Effects run child first, because a child is complete before its parent is.
          </>,
          <>
            <code>useLayoutEffect</code> runs during the commit, after the DOM has changed but before the browser paints: the place to measure layout or adjust it
            without a visible flicker. It blocks painting, so keep it short.
          </>,
          <>
            <code>useEffect</code> runs later. For updates caused by a discrete event such as a click, React runs the effects before the browser paints the next
            frame, so the effect&apos;s result shows up with the click; for other updates they normally run after the paint.
          </>,
          <>
            A transition shows the scheduler at work: React first re-renders urgently (so <code>isPending</code> can turn true), lets the browser draw a frame, and
            only then renders the transition itself.
          </>,
          <>
            Render must be pure: React may call a component more than once for one commit (Strict Mode does it on purpose in development), or start a render and
            throw it away.
          </>,
        ]}
        demoTitle="trigger updates three ways and read the order"
        demo={<PhasesDemo />}
        advice={[
          {
            do: "Read layout in useLayoutEffect, and do everything else (subscriptions, fetching, logging) in useEffect or in event handlers.",
            avoid: "Side effects in the component body: they can run twice, or for a render that never commits.",
          },
        ]}
        links={[
          { label: "React: Render and commit", href: "https://react.dev/learn/render-and-commit" },
          { label: "React: useLayoutEffect", href: "https://react.dev/reference/react/useLayoutEffect" },
          { label: "React: useEffect", href: "https://react.dev/reference/react/useEffect" },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            Not all updates are equally urgent. Typing must show at once; a list filtered by that typing can wait a moment. React gives updates{" "}
            <strong>priorities</strong> (lanes): urgent ones render synchronously, while <strong>transitions</strong> and <strong>deferred values</strong> render in
            small slices that yield to the browser and can be abandoned when newer input arrives.
          </>
        }
        points={[
          <>
            A synchronous render can&apos;t be interrupted: if the list takes 125 ms, the browser can&apos;t paint the next keystroke for 125 ms.
          </>,
          <>
            <code>useDeferredValue(query)</code> renders the input with the new text first, then re-renders the list with the deferred value at low priority. If
            another key arrives meanwhile, React drops that render and starts again with the latest value.
          </>,
          <>
            The slow component must be memoized (<code>memo</code>) so the urgent render can skip it, and React can only pause <em>between</em> components: one
            component that does 100 ms of work in its body can&apos;t be interrupted. The demo&apos;s list is 250 small row components for that reason.
          </>,
          <>
            <code>startTransition</code> does the same for state updates you trigger yourself, such as switching tabs. Neither makes the slow work faster; they keep it
            from blocking more important work, which is what Interaction to Next Paint measures (see{" "}
            <Link href={`${practiceHref("large-dataset-performance")}`} className={inline}>
              large dataset performance
            </Link>{" "}
            for making the work itself cheaper).
          </>,
        ]}
        demoTitle="type into a slow list, urgent vs deferred"
        demo={<SchedulingDemo />}
        advice={[
          {
            do: "Defer expensive views that follow input (results, charts), and keep the input itself urgent.",
            avoid: "Deferring the input's own value: typing then lags behind what the user pressed.",
          },
        ]}
        links={[
          { label: "React: useDeferredValue", href: "https://react.dev/reference/react/useDeferredValue" },
          { label: "React: useTransition", href: "https://react.dev/reference/react/useTransition" },
          { label: "web.dev: Interaction to Next Paint", href: "https://web.dev/articles/inp" },
        ]}
      />
    </div>
  );
}

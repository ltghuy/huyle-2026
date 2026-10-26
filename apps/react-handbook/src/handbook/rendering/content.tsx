import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { LoadingDemo } from "./loading-demo";
import { ParsingDemo } from "./parsing-demo";
import { PipelineDemo } from "./pipeline-demo";
import { ThrashDemo } from "./thrash-demo";

const MDN = "https://developer.mozilla.org/en-US/docs";

const TOPICS = [
  { id: "parsing", title: "Parsing: the DOM, the CSSOM and the render tree" },
  { id: "blocking", title: "What blocks parsing and rendering" },
  { id: "pipeline", title: "Layout, paint and composite" },
  { id: "layout-thrashing", title: "Layout thrashing" },
] as const;

const inline = "rounded-sm font-medium text-link underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function RenderingHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          Once the bytes of a page arrive (see{" "}
          <Link href={topicHref("networking")} className={inline}>
            Networking
          </Link>
          ), the browser turns them into pixels in a fixed order: <strong>parse</strong> HTML and CSS into trees, work out the{" "}
          <strong>style</strong> of every element, <strong>lay out</strong> the boxes, <strong>paint</strong> them, and{" "}
          <strong>composite</strong> the layers on screen. Knowing the order explains why a script delays the first paint, why some
          animations stutter, and why some loops freeze the page. The loading runs and timings in the demos are measured in your
          browser.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            The browser reads HTML as a stream of tokens and builds the <strong>DOM</strong>, a tree of nodes that scripts can read and
            change. CSS is parsed into the <strong>CSSOM</strong>. Combining the two gives the <strong>render tree</strong>: only what
            will be drawn, with its final styles.
          </>
        }
        points={[
          <>The HTML parser never fails: it adds missing <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code>, <code>&lt;body&gt;</code> and <code>&lt;tbody&gt;</code>, closes a <code>&lt;p&gt;</code> when another starts, and moves misplaced tags. What you wrote and what the DOM holds can differ.</>,
          <>A <strong>preload scanner</strong> reads ahead while the main parser is blocked, so the browser can start downloading stylesheets, scripts and images it finds further down.</>,
          <><code>display: none</code> removes an element and its children from the render tree; <code>visibility: hidden</code> keeps the box (it still takes space) but doesn&apos;t paint it.</>,
          <><code>::before</code> and <code>::after</code> boxes exist only in the render tree, and <code>display: contents</code> drops an element&apos;s own box but keeps its children.</>,
          <>The browser&apos;s developer tools show the DOM (Elements panel), not your source: check there when markup doesn&apos;t behave as written.</>,
        ]}
        demoTitle="edit HTML and CSS and compare the trees"
        demo={<ParsingDemo />}
        advice={[
          {
            do: "Write valid, explicitly nested HTML, and check the Elements panel when layout surprises you.",
            avoid: <>Relying on the parser to fix markup, such as a <code>&lt;div&gt;</code> inside a <code>&lt;p&gt;</code>: it moves nodes and breaks your CSS selectors.</>,
          },
        ]}
        links={[
          { label: "MDN: How browsers work", href: `${MDN}/Web/Performance/Guides/How_browsers_work` },
          { label: "web.dev: Render-tree construction", href: "https://web.dev/articles/critical-rendering-path/render-tree-construction" },
          { label: "MDN: CSS Object Model", href: `${MDN}/Web/API/CSS_Object_Model` },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Two different things can stop the browser. A stylesheet <strong>blocks rendering</strong>: nothing is painted until the CSS
            in <code>&lt;head&gt;</code> has arrived, so the page doesn&apos;t flash unstyled. A classic script <strong>blocks the parser</strong>: it
            may change the document, so parsing stops until it has downloaded and run.
          </>
        }
        points={[
          <>A classic <code>&lt;script src&gt;</code> in <code>&lt;head&gt;</code> runs before the body exists and holds back everything after it. At the end of <code>&lt;body&gt;</code> the content above can already be painted.</>,
          <>Scripts also wait for stylesheets earlier in the document, because they may read styles; a slow stylesheet followed by an inline script blocks both.</>,
          <><code>defer</code> downloads during parsing and runs after it, in document order, just before <code>DOMContentLoaded</code>. Module scripts behave the same by default.</>,
          <><code>async</code> runs as soon as it arrives, in whatever order the downloads finish; it suits independent scripts such as analytics.</>,
          <><code>DOMContentLoaded</code> fires when the HTML is parsed and deferred scripts have run; <code>load</code> waits for everything else too (images, stylesheets, async scripts).</>,
        ]}
        demoTitle="load a real page with slow CSS and scripts"
        demo={<LoadingDemo />}
        advice={[
          {
            do: <>Put scripts in <code>&lt;head&gt;</code> with <code>defer</code> (or <code>type=&quot;module&quot;</code>), and <code>async</code> only for scripts that depend on nothing.</>,
            avoid: <>Classic scripts in <code>&lt;head&gt;</code>, and inline scripts right after a large stylesheet.</>,
          },
        ]}
        links={[
          { label: "MDN: The script element", href: `${MDN}/Web/HTML/Reference/Elements/script` },
          { label: "web.dev: Adding interactivity with JavaScript", href: "https://web.dev/articles/critical-rendering-path/adding-interactivity-with-javascript" },
          { label: "MDN: DOMContentLoaded", href: `${MDN}/Web/API/Document/DOMContentLoaded_event` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            After style, the browser runs <strong>layout</strong> (the size and position of every box), <strong>paint</strong> (drawing
            text, colors and shadows into layers) and <strong>composite</strong> (putting the layers together on screen). A change only
            reruns the stages it affects, so some properties are far cheaper to animate than others.
          </>
        }
        points={[
          <>Geometry changes (<code>width</code>, <code>left</code>, <code>top</code>, <code>margin</code>, font size) rerun layout, then paint and composite, often for neighboring elements too.</>,
          <>Visual-only changes (<code>color</code>, <code>background-color</code>, <code>box-shadow</code>) skip layout but repaint.</>,
          <><code>transform</code> and <code>opacity</code> skip both: the compositor moves or fades an already painted layer, off the main thread, so the animation stays smooth while JavaScript is busy.</>,
          <>At 60 Hz a frame has about 16 ms for all of this, and script shares the same main thread; a long task means dropped frames.</>,
          <><code>will-change: transform</code> promotes an element to its own layer ahead of time; every layer costs memory, so use it sparingly.</>,
        ]}
        demoTitle="animate one box with different properties"
        demo={<PipelineDemo />}
        advice={[
          {
            do: <>Animate <code>transform</code> and <code>opacity</code>: move with <code>translate</code>, grow with <code>scale</code>.</>,
            avoid: <>Animating <code>left</code>, <code>top</code>, <code>width</code> or <code>height</code>, or putting <code>will-change</code> on everything.</>,
          },
        ]}
        links={[
          { label: "web.dev: Rendering performance", href: "https://web.dev/articles/rendering-performance" },
          { label: "web.dev: Stick to compositor-only properties", href: "https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count" },
          { label: "Chrome: RenderingNG architecture", href: "https://developer.chrome.com/docs/chromium/renderingng-architecture" },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            The browser normally batches style changes and lays out once, just before the next frame. Reading a layout value such as{" "}
            <code>offsetWidth</code> after a change forces it to lay out immediately. This is a <strong>forced synchronous layout</strong>,
            and doing it in a loop is <strong>layout thrashing</strong>.
          </>
        }
        points={[
          <>Reads that force layout include <code>offsetWidth/Height/Top</code>, <code>clientWidth</code>, <code>scrollTop</code>, <code>getBoundingClientRect()</code> and <code>getComputedStyle()</code> for layout values.</>,
          <>Read everything first, then write everything: the reads share one layout, the writes are laid out once before the next frame.</>,
          <>In separate pieces of code, do reads early and schedule writes in <code>requestAnimationFrame</code>; observers (<code>ResizeObserver</code>, <code>IntersectionObserver</code>) give sizes without forcing layout.</>,
          <>In the Performance panel, a purple &quot;Layout&quot; block with a &quot;Forced reflow&quot; warning points at the line that caused it.</>,
        ]}
        demoTitle="resize many elements two ways"
        demo={<ThrashDemo />}
        advice={[
          {
            do: "Batch DOM reads before writes, and cache sizes you read more than once.",
            avoid: <>Reading <code>offsetWidth</code> or <code>getBoundingClientRect()</code> inside a loop that also changes styles.</>,
          },
        ]}
        links={[
          { label: "web.dev: Avoid layout thrashing", href: "https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing" },
          { label: "What forces layout (Paul Irish)", href: "https://gist.github.com/paulirish/5d52fb081b3570c81e3a" },
        ]}
      />
    </div>
  );
}

import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { practiceHref, topicHref } from "@/practices/catalog";

import { CodeSplitDemo } from "./code-split-demo";
import { CriticalPathDemo } from "./critical-path-demo";
import { FontDisplayDemo } from "./font-display-demo";
import { HtmlDeliveryDemo } from "./html-delivery-demo";
import { LayoutShiftDemo } from "./layout-shift-demo";
import { LongTaskDemo } from "./long-task-demo";
import { VitalsMeter } from "./vitals-meter";

const LEARN = "https://web.dev/learn/performance";

const TOPICS = [
  { id: "why-speed-matters", title: "Why speed matters" },
  { id: "html-delivery", title: "HTML delivery and CDNs" },
  { id: "critical-path", title: "The critical path and resource hints" },
  { id: "images-and-video", title: "Images, video and lazy loading" },
  { id: "web-fonts", title: "Web fonts" },
  { id: "code-splitting", title: "Code splitting, prefetching and prerendering" },
  { id: "long-tasks", title: "Long tasks and web workers" },
];

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function PerformanceHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-3 text-foreground/85">
        <p>
          Web performance is how fast a page loads and how quickly it responds to the user. Slow pages lose people: they leave before
          the content shows, give up on a form that lags, or tap the wrong button when the layout jumps. Each topic below has a
          demo you can measure in your own browser.
        </p>
        <p className="text-sm text-muted-foreground">
          Based on web.dev&apos;s{" "}
          <a href={`${LEARN}/welcome`} target="_blank" rel="noreferrer" className={inline}>
            Learn Performance<span className="sr-only"> (opens in a new tab)</span>
          </a>{" "}
          course, shortened to its main concepts.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        id={TOPICS[0].id}
        number={1}
        title={TOPICS[0].title}
        intro={
          <>
            Speed is measured from the user&apos;s side. Google&apos;s <strong>Core Web Vitals</strong>{" "}
            name the three things users feel most, each judged at the 75th percentile of real visits.
          </>
        }
        points={[
          <><strong>LCP (loading)</strong>: when the largest image or text block appears. Good is 2.5 s or less.</>,
          <><strong>INP (responsiveness)</strong>: the delay from a click, tap or key press to the next paint, for the slowest interaction. Good is 200 ms or less.</>,
          <><strong>CLS (visual stability)</strong>: how much visible content moves unexpectedly. Good is 0.1 or less.</>,
          <><strong>Lab vs field</strong>: Lighthouse and DevTools test one load on your machine (lab); real users on slower phones and networks give field data (CrUX, the <code>web-vitals</code> library). Fix with lab tools, judge with field data.</>,
        ]}
        demoTitle="this page's own vitals"
        demo={<VitalsMeter />}
        advice={[
          {
            do: "Collect field data from real users (web-vitals → your analytics) and watch the 75th percentile.",
            avoid: "Judging speed by a single Lighthouse run on a fast laptop.",
          },
        ]}
        links={[
          { label: "Why speed matters", href: `${LEARN}/why-speed-matters` },
          { label: "Web Vitals", href: "https://web.dev/articles/vitals" },
        ]}
      />

      <Topic
        id={TOPICS[1].id}
        number={2}
        title={TOPICS[1].title}
        intro={
          <>
            Every page starts with one HTML request, and nothing else can start before its first bytes arrive. Time to First Byte
            (TTFB) covers redirects, DNS, the connection and the server&apos;s work; good is 0.8 s or less.
          </>
        }
        points={[
          <><strong>Avoid redirects</strong>: each one is another request, often on a new connection (<code>http</code> → <code>https</code>, a missing <code>www</code>, a trailing slash). Link to the final address.</>,
          <><strong>Cache HTML briefly</strong>: a short <code>Cache-Control</code> lifetime plus <code>ETag</code> or <code>Last-Modified</code> lets browsers and CDNs revalidate cheaply. Never cache personalised pages in a shared cache.</>,
          <><strong>Compress text</strong>: Brotli (about 15 to 20% smaller than gzip) with gzip as a fallback; pre-compress static CSS and JS at build time, compress HTML on the fly.</>,
          <><strong>Use a CDN</strong>: edge servers near your users cut every round trip, cache static files (and HTML when allowed), and bring HTTP/2 and HTTP/3, TLS 1.3 and compression by default.</>,
          <><strong>Measure the server</strong>: the <code>Server-Timing</code> header shows where TTFB goes (database, rendering); stream the HTML so the <code>&lt;head&gt;</code> leaves early.</>,
        ]}
        demoTitle="switch on a CDN, edge caching, compression and a direct link (simulated)"
        demo={<HtmlDeliveryDemo />}
        advice={[
          {
            do: <>Give hashed static files a long <code>max-age</code> (a year, <code>immutable</code>) and HTML a short one with revalidation.</>,
            avoid: "Caching pages that include user data at the CDN: one visitor's page can be served to another.",
          },
        ]}
        links={[
          { label: "General HTML performance", href: `${LEARN}/general-html-performance` },
        ]}
      />

      <Topic
        id={TOPICS[2].id}
        number={3}
        title={TOPICS[2].title}
        intro={
          <>
            Before the first paint the browser needs the HTML, then every stylesheet and every classic script in{" "}
            <code>&lt;head&gt;</code>: this chain is the <strong>critical rendering path</strong>. Shorten it, and help the browser find
            important files early.
          </>
        }
        points={[
          <>The clock starts with the HTML itself (see <a href="#html-delivery" className={inline}>HTML delivery and CDNs</a>); everything below can only begin once it arrives.</>,
          <>CSS blocks rendering and classic scripts block parsing (see <Link href={topicHref("rendering")} className={inline}>How the browser renders a page</Link>). Use <code>defer</code> (or <code>async</code> for independent scripts), and inline the small CSS needed above the fold.</>,
          <>The browser can only fetch what it has found. <code>preload</code> resources it finds late (CSS backgrounds, fonts), <code>preconnect</code> to the one or two other origins you will need right away, and use the cheaper <code>dns-prefetch</code> for origins needed later.</>,
          <><code>fetchpriority=&quot;high&quot;</code> tells the browser which image is the LCP, so it isn&apos;t queued behind less important ones.</>,
        ]}
        demoTitle="toggle each technique and watch first and largest paint (simulated)"
        demo={<CriticalPathDemo />}
        advice={[
          {
            do: "Preload or preconnect only the one or two resources the first paint needs.",
            avoid: "Preloading everything: each hint competes for the same bandwidth, so nothing comes first.",
          },
          {
            do: <>Use <code>defer</code> for scripts that need the DOM; keep the order they are written in.</>,
            avoid: <>Putting classic <code>&lt;script src&gt;</code> tags in <code>&lt;head&gt;</code> without <code>defer</code> or <code>async</code>.</>,
          },
        ]}
        links={[
          { label: "Critical path", href: `${LEARN}/understanding-the-critical-path` },
          { label: "Resource loading", href: `${LEARN}/optimize-resource-loading` },
          { label: "Resource hints", href: `${LEARN}/resource-hints` },
        ]}
      />

      <Topic
        id={TOPICS[3].id}
        number={4}
        title={TOPICS[3].title}
        intro={
          <>
            Images and video are usually the largest bytes on a page, an image is often the LCP element, and media that arrives
            late is the usual cause of layout shift.
          </>
        }
        points={[
          <>Send the right size: <code>srcset</code> and <code>sizes</code> let the browser pick a file for the screen. Prefer AVIF or WebP.</>,
          <>Always set <code>width</code> and <code>height</code> (or CSS <code>aspect-ratio</code>) so space is reserved before the image arrives.</>,
          <>Lazy-load images and <code>&lt;iframe&gt;</code>s below the fold with <code>loading=&quot;lazy&quot;</code>, but never the LCP image (see <Link href={practiceHref("lazy-images")} className={inline}>practice 11</Link>).</>,
          <>Heavy embeds (video players, maps, chat widgets): show a light <strong>facade</strong> (a poster image and a play button) and load the real iframe on click.</>,
          <>Video: set a small <code>poster</code>, use <code>preload=&quot;none&quot;</code> (or <code>metadata</code>) unless it plays at once, lazy-load it below the fold, and replace animated GIFs with a muted, looping <code>&lt;video&gt;</code>, often several times smaller.</>,
        ]}
        demoTitle="load an article with and without reserved image space"
        demo={<LayoutShiftDemo />}
        advice={[
          {
            do: <>Set <code>width</code>/<code>height</code> on every image and give the LCP image <code>fetchpriority=&quot;high&quot;</code>.</>,
            avoid: <>Adding <code>loading=&quot;lazy&quot;</code> to the hero image: it starts loading only after layout, which delays LCP.</>,
          },
        ]}
        links={[
          { label: "Images", href: `${LEARN}/image-performance` },
          { label: "Video", href: `${LEARN}/video-performance` },
          { label: "Lazy loading images and iframes", href: `${LEARN}/lazy-load-images-and-iframe-elements` },
        ]}
      />

      <Topic
        id={TOPICS[4].id}
        number={5}
        title={TOPICS[4].title}
        intro={
          <>
            Text set in a web font can&apos;t be drawn in that font until the file arrives. What the reader sees meanwhile, invisible text
            or a fallback font, is chosen with <code>font-display</code>.
          </>
        }
        points={[
          <><code>swap</code> shows text at once in a fallback font (good for body text); <code>optional</code> uses the font only if it is there almost at once (no late swap, best for CLS); <code>block</code> hides text for up to 3 s.</>,
          <>Send fewer bytes: WOFF2 only, subset to the characters you use (<code>unicode-range</code>), one variable font instead of many weights.</>,
          <>Find fonts early: self-host them on your own origin, preload the one or two the first paint needs, or <code>preconnect</code> to the font host.</>,
          <>Keep the swap from shifting the layout: match the fallback&apos;s size with <code>size-adjust</code> and <code>ascent-override</code> (<code>next/font</code> does this for you).</>,
        ]}
        demoTitle="watch the same text under block, swap and optional (simulated)"
        demo={<FontDisplayDemo />}
        advice={[
          {
            do: "Self-host one or two WOFF2 files, preload the one used above the fold, and use swap or optional.",
            avoid: "A render-blocking third-party font stylesheet that pulls six weights before any text can paint.",
          },
        ]}
        links={[{ label: "Web fonts", href: `${LEARN}/optimize-web-fonts` }]}
      />

      <Topic
        id={TOPICS[5].id}
        number={6}
        title={TOPICS[5].title}
        intro={
          <>
            Every kilobyte of JavaScript is downloaded, parsed and run on the main thread. Ship only what the current page needs, and
            fetch the rest (or the next page) just before it is needed.
          </>
        }
        points={[
          <>Split by route (Next.js does this per page) and by interaction: load a heavy dialog, editor or chart with <code>import()</code> when the user opens it.</>,
          <>Prefetch on intent: start loading when the pointer hovers or a link enters the viewport (<code>next/link</code> does this), so the click finds it ready.</>,
          <><code>&lt;link rel=&quot;prefetch&quot;&gt;</code> fetches a likely next resource at low priority, for later use.</>,
          <><strong>Speculation Rules</strong> (<code>&lt;script type=&quot;speculationrules&quot;&gt;</code>) prefetch or even <strong>prerender</strong> likely next pages, so they open instantly. Prerendering costs data and CPU, so keep it to links the user is very likely to follow (for example on hover).</>,
          <>A service worker can precache the files for the next visit and work offline (Workbox makes this easier).</>,
          <>Check what you ship with a bundle analyzer; one large dependency often outweighs everything else.</>,
        ]}
        demoTitle="load a chart's code only when it's opened"
        demo={<CodeSplitDemo />}
        advice={[
          {
            do: "Lazy-load code behind an interaction or below the fold, and prefetch it on intent.",
            avoid: "Splitting into dozens of tiny chunks that must load one after another for the first paint.",
          },
        ]}
        links={[
          { label: "Code splitting", href: `${LEARN}/code-split-javascript` },
          { label: "Prefetching and prerendering", href: `${LEARN}/prefetching-prerendering-precaching` },
        ]}
      />

      <Topic
        id={TOPICS[6].id}
        number={7}
        title={TOPICS[6].title}
        intro={
          <>
            The main thread runs your JavaScript, styles, layout and paint, one task at a time. A task over 50 ms is a{" "}
            <strong>long task</strong>: while it runs, clicks and key presses wait, which is what INP measures.
          </>
        }
        points={[
          <>Break long work into chunks and yield between them so input and painting can happen in between: <code>scheduler.yield()</code> resumes first (good for input), a new task (<code>setTimeout</code>, <code>MessageChannel</code>) lets rendering go first.</>,
          <>Move pure computation (parsing, filtering, image processing) to a <strong>web worker</strong>. Workers have no DOM access and messages are copied, unless you <strong>transfer</strong> an <code>ArrayBuffer</code>, which moves it between threads for free.</>,
          <>The course&apos;s worker example reads Exif metadata from JPEGs; the demo below blurs a photo there, sending its pixels both ways as a transferable.</>,
          <>In React, keep input urgent with <code>useTransition</code> or <code>useDeferredValue</code> and render less (see <Link href={practiceHref("large-dataset-performance")} className={inline}>practice 14</Link>).</>,
        ]}
        demoTitle="blur a photo in one go, in chunks, and in a worker"
        demo={<LongTaskDemo />}
        advice={[
          {
            do: "Profile with the DevTools Performance panel and split or move the longest tasks first.",
            avoid: "Running heavy loops in click handlers: the click's own paint waits for them, so INP shows the whole loop.",
          },
        ]}
        links={[
          { label: "Web workers", href: `${LEARN}/web-worker-overview` },
          { label: "A web worker use case", href: `${LEARN}/web-worker-demo` },
          { label: "Optimize long tasks", href: "https://web.dev/articles/optimize-long-tasks" },
        ]}
      />
    </div>
  );
}

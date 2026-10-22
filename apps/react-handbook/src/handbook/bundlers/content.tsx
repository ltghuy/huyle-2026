import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { DevServerDemo } from "./devserver-demo";
import { GraphDemo } from "./graph-demo";
import { HmrDemo } from "./hmr-demo";
import { ResolveDemo } from "./resolve-demo";
import { RuntimeDemo } from "./runtime-demo";
import { SplitDemo } from "./split-demo";
import { TreeShakeDemo } from "./treeshake-demo";

const TOPICS = [
  { id: "graph", title: "Resolving imports into a module graph" },
  { id: "runtime", title: "The runtime that links modules" },
  { id: "tree-shaking", title: "Tree shaking and side effects" },
  { id: "code-splitting", title: "Code splitting and lazy chunks" },
  { id: "dev-servers", title: "Dev servers and hot updates" },
] as const;

const inline = "rounded-sm font-medium text-link underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

function Divider() {
  return <hr className="my-2 border-dashed" />;
}

export function BundlersHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          After{" "}
          <Link href={topicHref("transpiling")} className={inline}>
            transpiling
          </Link>
          , every file is plain JavaScript, but still hundreds of separate files importing each other. A bundler turns them into a few files the browser can load
          fast: it resolves every import into a graph, links the modules with a small runtime, removes what nothing uses, and
          splits what can wait into chunks loaded later.
        </p>
        <p>
          The demos on this page are driven by one small bundler that runs in your browser, built on the compiler from the previous page. Edit the sample files and
          the graph, the bundle and what runs all change. It is simplified, but the bundles it produces do run, here in the page.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            A bundler starts at an <strong>entry</strong> file and follows every <code>import</code>. For each one it must answer: which file does this string
            mean? The answer depends on rules that Node.js defined and bundlers follow, and on fields in each package&apos;s <code>package.json</code>.
          </>
        }
        points={[
          <>
            Relative specifiers (<code>./App</code>) try the path as written, then with each configured extension, then as a folder with an <code>index</code> file.
            Bare specifiers (<code>react</code>) are looked up in <code>node_modules</code>, in the importer&apos;s folder and then each parent.
          </>,
          <>
            A package&apos;s <code>&quot;exports&quot;</code> map is the public API: subpaths it doesn&apos;t list can&apos;t be imported at all.{" "}
            <strong>Conditions</strong> inside it (<code>browser</code>, <code>import</code>, <code>require</code>, <code>default</code>…) are checked in the
            order they are written, and the first active one wins.
          </>,
          <>
            Without <code>exports</code>, bundlers fall back to <code>&quot;browser&quot;</code>, <code>&quot;module&quot;</code> and <code>&quot;main&quot;</code>,
            in that order for the web. That is how one package ships an ES module build to bundlers and a CommonJS build to Node.
          </>,
          <>
            The graph also records <em>how</em> each module is imported: statically, for side effects only (<code>import &quot;./analytics&quot;</code>), or
            dynamically with <code>import()</code>, which later starts a new chunk.
          </>,
        ]}
        demoTitle="resolve imports, then edit the project and watch its graph"
        demo={
          <div className="flex flex-col gap-6">
            <ResolveDemo />
            <Divider />
            <GraphDemo />
          </div>
        }
        advice={[
          {
            do: <>Import packages through their public entry points, and check a package&apos;s <code>exports</code> when an import fails after an upgrade.</>,
            avoid: <>Deep imports such as <code>pkg/dist/internal/x</code>: an <code>exports</code> map forbids them, and they break when the package reorganizes.</>,
          },
        ]}
        links={[
          { label: "Node.js: Package entry points", href: "https://nodejs.org/api/packages.html#package-entry-points" },
          { label: "webpack: Module resolution", href: "https://webpack.js.org/concepts/module-resolution/" },
          { label: "Vite: Dependency pre-bundling", href: "https://vite.dev/guide/dep-pre-bundling" },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Browsers can load ES modules, but a bundle puts many modules in one file, so the bundler has to recreate what <code>import</code> does. webpack wraps each
            module in a function and adds a tiny <strong>runtime</strong>: a module registry, a cache, and a <code>require</code> function that runs a module the
            first time it&apos;s needed.
          </>
        }
        points={[
          <>
            Every module runs once. The second import of <code>format.ts</code> returns the cached exports, so its top-level code doesn&apos;t run
            again.
          </>,
          <>
            Exports are getters (webpack&apos;s <code>__webpack_require__.d</code>), so importers always read the current value: ES module bindings
            are live. Real bundlers also call imported functions as <code>(0, _format.formatPrice)(x)</code>, so <code>this</code> is not the module object.
          </>,
          <>
            Imports run before the module&apos;s own code, depth first, in the order they are written. That order, and the logs in the demo, are the same as the
            browser&apos;s native module loader.
          </>,
          <>
            In a <strong>cycle</strong>, one module has to run while the other is still unfinished. Reading its <code>const</code> then throws{" "}
            <code>Cannot access &apos;a&apos; before initialization</code>. Function declarations are hoisted, so they survive cycles; constants don&apos;t.
          </>,
          <>
            Production builds usually <strong>scope-hoist</strong> instead (Rollup, Rolldown, esbuild, webpack&apos;s ModuleConcatenationPlugin): ES modules are
            joined into one scope and the wrappers disappear, as in{" "}
            <Link href={`${topicHref("build-pipeline")}#stages`} className={inline}>
              the optimize stage
            </Link>
            .
          </>,
        ]}
        demoTitle="read the bundle, then run it"
        demo={<RuntimeDemo />}
        advice={[
          {
            do: "Break import cycles by moving the shared piece into a third module both can import.",
            avoid: "Reading another module's exported constants at the top level of a module that module imports back.",
          },
        ]}
        links={[
          { label: "webpack: Runtime and manifest", href: "https://webpack.js.org/concepts/manifest/" },
          { label: "MDN: JavaScript modules", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules" },
          { label: "Rollup: Tree shaking and scope hoisting", href: "https://rollupjs.org/introduction/#tree-shaking" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            <strong>Tree shaking</strong> removes code nothing uses. It works because ES module imports are static: the bundler can see exactly which exports each
            module asks for, without running anything. What it can&apos;t know is whether top-level code that <em>runs</em> on import matters.
          </>
        }
        points={[
          <>
            An unused export is easy to drop. Top-level code such as <code>registerIcon(&quot;cart&quot;, CartIcon)</code> is harder: it might change global
            state, so a careful bundler keeps it, and with it the whole module.
          </>,
          <>
            <code>&quot;sideEffects&quot;: false</code> in a package&apos;s <code>package.json</code> promises that importing a module for nothing has no effect worth
            keeping, so whole modules can go. List files that do have effects, such as CSS: <code>&quot;sideEffects&quot;: [&quot;*.css&quot;]</code>.
          </>,
          <>
            <code>{"/*#__PURE__*/"}</code> before a call says the same about one call: if its result is unused, the call can be removed. Compilers add it to{" "}
            <code>React.createElement</code> and to <code>enum</code> objects for this reason.
          </>,
          <>
            CommonJS (<code>require</code>, <code>module.exports</code>) is dynamic, so bundlers mostly can&apos;t tree-shake it. Prefer packages that publish ES
            modules.
          </>,
        ]}
        demoTitle="toggle the side-effects flag and the pure annotation"
        demo={<TreeShakeDemo />}
        advice={[
          {
            do: <>Publish libraries as ES modules with <code>&quot;sideEffects&quot;</code> set, and keep top-level code free of side effects.</>,
            avoid: "Importing one icon from a barrel file of a library that doesn't declare sideEffects: you may bundle every icon.",
          },
        ]}
        links={[
          { label: "webpack: Tree shaking", href: "https://webpack.js.org/guides/tree-shaking/" },
          { label: "Rollup: Tree shaking options", href: "https://rollupjs.org/configuration-options/#treeshake" },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            Every <code>import()</code> is a split point: the module and what it imports go into a separate <strong>chunk</strong> that is downloaded only when
            that code runs. This is how routes, dialogs and heavy widgets stay out of the first download.
          </>
        }
        points={[
          <>
            The runtime remembers loaded chunks, so opening a page a second time costs nothing. The chunk names it needs are part of the runtime, which is why{" "}
            <Link href={`${topicHref("build-pipeline")}#content-hashes`} className={inline}>
              content hashes
            </Link>{" "}
            change when a lazy chunk does.
          </>,
          <>
            A module used by two lazy chunks is either duplicated (downloaded twice, run once) or moved to a <strong>shared chunk</strong> that
            both load in parallel. Bundlers split shared code by default above a size threshold.
          </>,
          <>
            Lazy chunks that import more lazy chunks create a <strong>waterfall</strong>: each download starts only after the previous one ran. Preload what you know
            will be needed (Next.js prefetches visible links&apos; routes).
          </>,
          <>
            In React, <code>lazy(() =&gt; import(&quot;./Page&quot;))</code> plus <code>&lt;Suspense&gt;</code> uses this mechanism; Next.js splits every
            route automatically.
          </>,
        ]}
        demoTitle="load the page, open the lazy routes, toggle shared chunks"
        demo={<SplitDemo />}
        advice={[
          {
            do: "Split by route and by rarely used features, and preload the next likely chunk.",
            avoid: "Splitting tiny modules: each chunk is a request, and many small ones can be slower than one larger file.",
          },
        ]}
        links={[
          { label: "webpack: Code splitting", href: "https://webpack.js.org/guides/code-splitting/" },
          { label: "React: lazy", href: "https://react.dev/reference/react/lazy" },
          { label: "Next.js: Lazy loading", href: "https://nextjs.org/docs/app/guides/lazy-loading" },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            In development the goal changes from &quot;small output&quot; to &quot;fast feedback&quot;. The three common designs differ in when they do the work:
            all up front, on request, or incrementally, with everything cached.
          </>
        }
        points={[
          <>
            <strong>Bundle first</strong> (webpack dev server): the whole app is bundled before the first page, so start-up grows with the app; afterwards
            rebuilds are incremental.
          </>,
          <>
            <strong>Native ES modules</strong> (Vite): source is served unbundled and transformed when the browser requests each file, so start-up is nearly
            instant. Very large pages then make thousands of requests; dependencies are pre-bundled to keep that number down.
          </>,
          <>
            <strong>Incremental bundling</strong> (Turbopack): bundle, but only what the requested route needs, and cache every step so an edit redoes almost
            nothing.
          </>,
          <>
            <strong>Hot module replacement</strong> swaps an edited module in the running page. The update climbs through the modules that import it until one
            accepts it; with React Fast Refresh, a file that only exports components accepts and keeps its state. Reaching the top without one means a full reload.
          </>,
        ]}
        demoTitle="compare the designs, then follow a hot update"
        demo={
          <div className="flex flex-col gap-6">
            <DevServerDemo />
            <Divider />
            <HmrDemo />
          </div>
        }
        advice={[
          {
            do: "Keep component files exporting only components, so Fast Refresh can update them in place and keep their state.",
            avoid: "Exporting constants or helpers from component files: every edit to them reloads the page.",
          },
        ]}
        links={[
          { label: "Vite: Why Vite", href: "https://vite.dev/guide/why" },
          { label: "Next.js: Turbopack", href: "https://nextjs.org/docs/app/api-reference/turbopack" },
          { label: "Vite: HMR API", href: "https://vite.dev/guide/api-hmr" },
        ]}
      />
    </div>
  );
}

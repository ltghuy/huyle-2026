import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { HashingDemo } from "./hashing-demo";
import { LoadedDemo } from "./loaded-demo";
import { ModesDemo } from "./modes-demo";
import { StagesDemo } from "./stages-demo";
import { ToolchainDemo } from "./toolchain-demo";

const TOPICS = [
  { id: "toolchains", title: "One command, many tools" },
  { id: "stages", title: "The stages: resolve, transform, bundle, optimize, emit" },
  { id: "modes", title: "Development and production builds" },
  { id: "content-hashes", title: "Content hashes and long-term caching" },
  { id: "real-build", title: "What this page loaded" },
] as const;

const inline = "rounded-sm font-medium text-link underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function BuildPipelineHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          <code className="font-mono text-[0.9em]">npx create-react-app</code>, <code className="font-mono text-[0.9em]">npm create vite</code> and{" "}
          <code className="font-mono text-[0.9em]">create-next-app</code> each hand you a project that just runs. Behind{" "}
          <code className="font-mono text-[0.9em]">npm run build</code> sits a chain of separate tools: one finds your files, one turns TypeScript and JSX into
          JavaScript, one handles CSS, one joins everything into bundles, one shrinks them. The sections below name each tool and step a small app through every
          stage; the last one shows this site&apos;s own build output, measured in your browser.
        </p>
        <p>
          The next pages go deeper into each stage:{" "}
          <Link href={topicHref("transpiling")} className={inline}>
            transpiling
          </Link>
          ,{" "}
          <Link href={topicHref("bundlers")} className={inline}>
            bundlers
          </Link>
          ,{" "}
          <Link href={topicHref("css-pipeline")} className={inline}>
            the CSS pipeline
          </Link>{" "}
          and, once the code runs,{" "}
          <Link href={topicHref("react-internals")} className={inline}>
            how React turns JSX into DOM updates
          </Link>
          .
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            A build tool is a <strong>toolchain</strong>: separate programs, each doing one job, wired together by a configuration you may never see. The jobs
            are the same everywhere; setups differ in which tool fills each slot, and in which slots they leave empty on purpose.
          </>
        }
        points={[
          <>
            Create React App wrapped webpack and Babel in one package, <code>react-scripts</code>, with a fixed configuration. Changing it meant{" "}
            <code>npm run eject</code>, which copied hundreds of lines of webpack config into your project for good.
          </>,
          <>
            Vite doesn&apos;t bundle your source in development: the browser loads each file as a native ES module, transformed on request. Only
            dependencies are pre-bundled. Production builds are bundled, with Rolldown since Vite 8.
          </>,
          <>
            Next.js builds client and server code together, so its build also decides what renders on the server. Turbopack is its default
            bundler in both <code>next dev</code> and <code>next build</code>.
          </>,
          <>
            Stripping types is not checking them. Babel, SWC and Oxc delete type annotations without reading them, which is why they are fast; only <code>tsc</code>{" "}
            (or a plugin running it) finds type errors. Vite never type-checks; Next.js does it during <code>next build</code>.
          </>,
          <>
            Most of these tools are written in Rust or Go (SWC, Oxc, Rolldown, Turbopack, Lightning CSS, esbuild) rather than JavaScript, which is where most of the
            speed-ups of the last few years came from.
          </>,
        ]}
        demoTitle="pick a setup and see which tool does each job"
        demo={<ToolchainDemo />}
        advice={[
          {
            do: "Know which tool fills each slot in your project, so you look in the right documentation when a build fails.",
            avoid: "Starting new projects on Create React App: it is deprecated and its dependencies no longer get updates.",
          },
          {
            do: <>Run <code>tsc --noEmit</code> in CI when your bundler doesn&apos;t type-check.</>,
            avoid: "Assuming a green dev server means the code has no type errors.",
          },
        ]}
        links={[
          { label: "React: Sunsetting Create React App", href: "https://react.dev/blog/2025/02/14/sunsetting-create-react-app" },
          { label: "Vite: Why Vite", href: "https://vite.dev/guide/why" },
          { label: "Next.js: Turbopack", href: "https://nextjs.org/docs/app/api-reference/turbopack" },
          { label: "webpack: Concepts", href: "https://webpack.js.org/concepts/" },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Every bundler runs the same five stages. It starts at an <strong>entry</strong> file, follows imports to build a <strong>module graph</strong>,
            transforms each module into plain JavaScript, joins the modules into <strong>bundles</strong>, optimizes them, and writes files to disk.
          </>
        }
        points={[
          <>
            <strong>Resolving</strong> turns an import string into a file. A relative path (<code>./App</code>) tries extensions until one exists; a bare name (
            <code>react-dom/client</code>) is looked up in <code>node_modules</code> through the package&apos;s <code>exports</code> field.
          </>,
          <>
            Resolve and transform alternate, file by file: a bundler can&apos;t see a file&apos;s imports until it has transformed it. The JSX transform even adds an
            import (<code>react/jsx-runtime</code>) that isn&apos;t in your source.
          </>,
          <>
            A non-JavaScript file (CSS, an image, JSON) only enters the graph through a <strong>loader</strong> or plugin that turns it into a module. Without one,
            webpack fails with &quot;You may need an appropriate loader to handle this file type&quot;.
          </>,
          <>
            Bundling wraps each module in a function and adds a small <strong>runtime</strong> (a <code>require()</code> and a module cache) that links them.
            Production builds then <strong>scope-hoist</strong> ES modules into one function, which removes that overhead.
          </>,
          <>
            <strong>Tree shaking</strong> works because ES module imports and exports are static: the bundler can prove <code>slugify</code> is never used without
            running anything.
          </>,
        ]}
        demoTitle="step a four-file app through the build"
        demo={<StagesDemo />}
        advice={[
          {
            do: "Import from ES module builds of packages, and import only what you use, so tree shaking can remove the rest.",
            avoid: "Barrel files that re-export a whole library from one index: the bundler may have to read and keep far more than you import.",
          },
        ]}
        links={[
          { label: "webpack: Module resolution", href: "https://webpack.js.org/concepts/module-resolution/" },
          { label: "Node.js: Package entry points (exports)", href: "https://nodejs.org/api/packages.html#package-entry-points" },
          { label: "webpack: Tree shaking", href: "https://webpack.js.org/guides/tree-shaking/" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            The same source builds two ways. A development build is tuned for how fast it rebuilds and how easy it is to debug; a
            production build is tuned for how little the browser has to download and run. Most surprises (&quot;it works locally&quot;, a huge
            dev bundle, warnings that vanish in production) come from that difference.
          </>
        }
        points={[
          <>
            The build replaces <code>process.env.NODE_ENV</code> with a string constant (webpack&apos;s <code>DefinePlugin</code>, Vite&apos;s{" "}
            <code>define</code>). The minifier then folds the condition and deletes branches that can never run.
          </>,
          <>
            React itself ships two builds, picked by the same flag. The development build checks hooks, keys and props and warns; the production build skips all
            of that, which makes it smaller and faster.
          </>,
          <>
            Only <code>process.env.NODE_ENV</code> and variables you expose on purpose (<code>NEXT_PUBLIC_</code>, <code>VITE_</code>) are replaced. Anything
            replaced ends up as plain text in the bundle, so never expose a secret this way.
          </>,
          <>
            Source maps let the browser&apos;s developer tools show your original files. Development usually inlines them for speed; production writes separate{" "}
            <code>.map</code> files that you can keep off the public server and upload to an error tracker instead.
          </>,
        ]}
        demoTitle="switch the sample between development and production"
        demo={<ModesDemo />}
        advice={[
          {
            do: <>Measure performance and bundle size on a production build (<code>npm run build</code>, then serve it), never on the dev server.</>,
            avoid: "Reading a secret through process.env in client code: the build inlines its value into a file anyone can download.",
          },
        ]}
        links={[
          { label: "webpack: Production", href: "https://webpack.js.org/guides/production/" },
          { label: "Vite: Env variables and modes", href: "https://vite.dev/guide/env-and-mode" },
          { label: "Next.js: Environment variables", href: "https://nextjs.org/docs/app/guides/environment-variables" },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            Production file names carry a <strong>content hash</strong>, such as <code>main-3f2a9c1d.js</code>. The name changes exactly when the content does, so
            the server can tell browsers to cache the file for a year: a new deploy gets new names and can&apos;t be served stale.
          </>
        }
        points={[
          <>
            The HTML is the one file that must not be cached long: it holds the current names. Serve it with <code>Cache-Control: no-cache</code> and the hashed
            files with <code>max-age=31536000, immutable</code> (see{" "}
            <Link href={`${topicHref("networking")}#http-caching`} className={inline}>
              HTTP caching
            </Link>
            ).
          </>,
          <>
            Splitting rarely-changing dependencies into a <strong>vendor</strong> chunk means a change to your code doesn&apos;t make every visitor download React
            again.
          </>,
          <>
            The runtime that loads lazy chunks contains their hashed names. Left inside <code>main</code>, editing a lazy page renames{" "}
            <code>main</code> too; split into its own small chunk (webpack&apos;s <code>runtimeChunk</code>), the change stays local.
          </>,
          <>
            Hashes must be deterministic: the same input must give the same name on every build machine, or each deploy busts the cache for no reason.
          </>,
        ]}
        demoTitle="edit a file and see which names change"
        demo={<HashingDemo />}
        advice={[
          {
            do: "Cache hashed assets forever and the HTML not at all.",
            avoid: <>Query-string versions such as <code>main.js?v=2</code>: some caches ignore them, and you must bump them by hand.</>,
          },
        ]}
        links={[
          { label: "webpack: Caching", href: "https://webpack.js.org/guides/caching/" },
          { label: "web.dev: HTTP cache", href: "https://web.dev/articles/http-cache" },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            This site is a Next.js 16 app built with Turbopack. Everything above happened to its source too: the files below are the chunks the build emitted, and
            your browser recorded each download in its Resource Timing buffer.
          </>
        }
        points={[
          <>
            Next.js splits code per route: this page loads the shared framework chunks plus the chunks for its own demos, not the code of every other page.
          </>,
          <>
            The demos on this page are client components; the text is rendered on the server and sent as HTML, so it adds no JavaScript.
          </>,
          <>
            <strong>Transferred</strong> is what came over the network (compressed, plus headers); <strong>Decoded</strong> is what the browser had to parse. Both
            matter: one costs bandwidth, the other CPU time.
          </>,
        ]}
        demoTitle="list the build files this page loaded"
        demo={<LoadedDemo />}
        advice={[
          {
            do: "Check what a page really loads in the Network panel or with Resource Timing, on a production build.",
            avoid: "Judging bundle size from the size of your source files: dependencies and the framework usually outweigh them.",
          },
        ]}
        links={[
          { label: "MDN: PerformanceResourceTiming", href: "https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming" },
          { label: "Next.js: Package bundling", href: "https://nextjs.org/docs/app/guides/package-bundling" },
        ]}
      />
    </div>
  );
}

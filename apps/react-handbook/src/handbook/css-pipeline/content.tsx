import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { DeliveryDemo } from "./delivery-demo";
import { ModulesDemo } from "./modules-demo";
import { PostcssDemo } from "./postcss-demo";
import { SassDemo } from "./sass-demo";
import { TailwindDemo } from "./tailwind-demo";

const TOPICS = [
  { id: "delivery", title: "How CSS reaches the page" },
  { id: "sass", title: "Sass: a language that compiles to CSS" },
  { id: "postcss", title: "PostCSS: CSS as a syntax tree" },
  { id: "css-modules", title: "CSS Modules: scoped class names" },
  { id: "tailwind", title: "Tailwind: generating only what you use" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function CssPipelineHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 text-foreground/85">
        <p>
          A bundler only understands JavaScript, so <code className="font-mono text-[0.9em]">import &quot;./styles.css&quot;</code> needs help: a CSS step that
          compiles languages such as Sass, rewrites the CSS with PostCSS plugins, scopes class names, generates utilities, minifies, and finally decides how the
          result reaches the browser. In Next.js 16 most of this is Lightning CSS and PostCSS behind Turbopack; in Vite and webpack the same jobs are done by a
          chain of plugins or loaders.
        </p>
        <p>
          Where the real tool can run in a browser, the demos use it: PostCSS and the Tailwind compiler are downloaded when you reach them (code splitting, from{" "}
          <Link href={topicHref("bundlers")} className={inline}>
            the previous page
          </Link>
          ). The Sass compiler is a small stand-in checked against Dart Sass, and the rendering demos run in real frames.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            A bundler can deliver CSS in two ways. In development it usually turns each CSS file into a JavaScript module that inserts a{" "}
            <code>&lt;style&gt;</code> tag, so it can hot-swap styles without a reload. In production it <strong>extracts</strong> the CSS into
            real <code>.css</code> files linked from the HTML.
          </>
        }
        points={[
          <>
            A stylesheet <code>&lt;link&gt;</code> in the <code>&lt;head&gt;</code> is <strong>render-blocking</strong>: the browser waits for it before the first
            paint, so the page never appears unstyled (see{" "}
            <Link href={`${topicHref("rendering")}#blocking`} className={inline}>
              what blocks rendering
            </Link>
            ).
          </>,
          <>
            Styles inserted by JavaScript arrive only after the script has downloaded and run. If the HTML has painted by then, users see a{" "}
            <strong>flash of unstyled content</strong> (FOUC). Runtime CSS-in-JS libraries have the same problem unless they also render the styles on the server.
          </>,
          <>
            CSS keeps import order: the bundler concatenates files in the order the modules import them, and with equal specificity the later rule
            wins. Reordering imports can change how a page looks.
          </>,
          <>
            Extracted CSS gets content hashes like JavaScript does, and is split per route or chunk, so a page downloads only the styles its components import.
          </>,
        ]}
        demoTitle="load the same page both ways"
        demo={<DeliveryDemo />}
        advice={[
          {
            do: "Ship extracted, hashed stylesheets in production, or render critical CSS on the server.",
            avoid: "Judging a page's styling from the dev server: injected styles can flash there but not in production, and the other way round.",
          },
        ]}
        links={[
          { label: "web.dev: Render-blocking CSS", href: "https://web.dev/articles/critical-rendering-path/render-blocking-css" },
          { label: "Next.js: CSS", href: "https://nextjs.org/docs/app/getting-started/css" },
          { label: "Vite: CSS", href: "https://vite.dev/guide/features#css" },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Sass (SCSS syntax) is a language that compiles to CSS. Everything it adds exists only at build time: the browser never sees a variable,
            a mixin or a nested rule, just the flat CSS they produce.
          </>
        }
        points={[
          <>
            <code>$variables</code> are replaced by their values when compiling, so they can&apos;t change at runtime. CSS custom properties (
            <code>--brand</code>) can, which is why design systems now use them for theming.
          </>,
          <>
            Nesting joins selectors: <code>&amp;</code> is the parent selector, so <code>&amp;__title</code> becomes <code>.card__title</code> and{" "}
            <code>.dark &amp;</code> becomes <code>.dark .card</code>. A nested <code>@media</code> bubbles up and wraps the parent selector.
          </>,
          <>
            Mixins paste their declarations wherever they are included: convenient, but each <code>@include</code> repeats the CSS.
          </>,
          <>
            Browsers now support CSS nesting natively, so for many projects the main reason to use Sass is gone; build tools can still flatten
            nesting for older browsers (next topic).
          </>,
        ]}
        demoTitle="edit SCSS and read the CSS it becomes"
        demo={<SassDemo />}
        advice={[
          {
            do: "Use custom properties for values that change (themes, dark mode) and Sass variables only for build-time constants.",
            avoid: "Deep nesting: every level lengthens selectors and raises specificity.",
          },
        ]}
        links={[
          { label: "Sass: Basics", href: "https://sass-lang.com/guide/" },
          { label: "MDN: CSS nesting", href: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            PostCSS does to CSS what Babel does to JavaScript: it parses the stylesheet into a syntax tree, hands the tree to a list of
            plugins in order, and prints the result. PostCSS itself changes nothing; every behavior comes from a plugin.
          </>
        }
        points={[
          <>
            The tree has few node types: <code>Root</code>, <code>Rule</code> (a selector and its block), <code>AtRule</code> (<code>@media</code>…),{" "}
            <code>Declaration</code> and <code>Comment</code>. A plugin visits the nodes it cares about and edits them.
          </>,
          <>
            Autoprefixer, postcss-preset-env (future CSS for today&apos;s browsers), cssnano (minifying) and Tailwind CSS v3 are all PostCSS plugins; Tailwind v4 ships
            one too, which is how this site builds its CSS.
          </>,
          <>
            Order matters: flatten nesting before plugins that only understand flat rules, and minify last.
          </>,
          <>
            Lightning CSS, written in Rust, does parsing, prefixing, nesting and minifying in one fast pass. Next.js 16 uses it for CSS Modules and nesting, and Vite
            8 for minifying; both still run PostCSS for the plugins you configure.
          </>,
        ]}
        demoTitle="pick a node, toggle the plugins"
        demo={<PostcssDemo />}
        advice={[
          {
            do: "Let your browserslist decide prefixes and lowering, and keep the PostCSS config to the plugins you need.",
            avoid: "Writing vendor prefixes by hand: they go stale and drift from what your targets need.",
          },
        ]}
        links={[
          { label: "PostCSS: Writing a plugin", href: "https://postcss.org/docs/writing-a-postcss-plugin" },
          { label: "Autoprefixer", href: "https://github.com/postcss/autoprefixer" },
          { label: "Lightning CSS", href: "https://lightningcss.dev/" },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            Every class in plain CSS is global: two components that both define <code>.title</code> fight, and whichever stylesheet loads later
            wins for both. CSS Modules fix this at build time by renaming each class to something unique to its file.
          </>
        }
        points={[
          <>
            Importing <code>Card.module.css</code> gives the component an object that maps the names you wrote to the generated ones:{" "}
            <code>styles.title</code> is <code>&quot;Card_title__3f9a1&quot;</code>. Only that file&apos;s rules use that name.
          </>,
          <>
            <code>:global(.dark)</code> opts a selector out of renaming, for classes set elsewhere (a theme class on <code>&lt;html&gt;</code>).{" "}
            <code>composes: base</code> adds another class from the module to this one&apos;s export.
          </>,
          <>
            Scoping is plain CSS at runtime: nothing runs in the browser, unlike runtime CSS-in-JS.
          </>,
          <>
            Next.js supports <code>.module.css</code> out of the box; this site uses Tailwind utilities instead, which avoid the problem by not naming components at
            all.
          </>,
        ]}
        demoTitle="render two components with the same class name"
        demo={<ModulesDemo />}
        advice={[
          {
            do: "Give each component its own .module.css, and use :global only for classes you don't control.",
            avoid: "Relying on stylesheet import order to settle conflicts between components.",
          },
        ]}
        links={[
          { label: "CSS Modules", href: "https://github.com/css-modules/css-modules" },
          { label: "Next.js: CSS Modules", href: "https://nextjs.org/docs/app/getting-started/css#css-modules" },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            Tailwind defines thousands of possible utility classes but ships only the ones you use. It doesn&apos;t parse your JavaScript: it reads your source files
            as text, collects every string that could be a class (<strong>candidates</strong>), and generates CSS for the candidates that are real utilities.
          </>
        }
        points={[
          <>
            Anything that isn&apos;t a utility (<code>className</code>, <code>div</code>, <code>btn-primary</code>) is ignored, which is why scanning
            everything as text is safe.
          </>,
          <>
            A class built from pieces at runtime, such as <code>{"`bg-${color}-500`"}</code>, never appears whole in the source, so it is never generated. Write the
            full names, for example in a lookup object.
          </>,
          <>
            Tailwind v4 writes utilities against <strong>theme variables</strong> (<code>padding: calc(var(--spacing) * 4)</code>) and emits only the variables that
            are used.
          </>,
          <>
            Variants such as <code>hover:</code> and <code>md:</code> wrap the rule in a selector or media query, so the order of utilities in the output is decided
            by Tailwind, not by your class attribute.
          </>,
        ]}
        demoTitle="edit markup and watch the real Tailwind output"
        demo={<TailwindDemo />}
        advice={[
          {
            do: "Keep full class names in the source, and map dynamic values to complete classes.",
            avoid: "Concatenating class names from pieces, or safelisting huge ranges of classes just in case.",
          },
        ]}
        links={[
          { label: "Tailwind: Detecting classes in source files", href: "https://tailwindcss.com/docs/detecting-classes-in-source-files" },
          { label: "Tailwind: Theme variables", href: "https://tailwindcss.com/docs/theme" },
        ]}
      />
    </div>
  );
}

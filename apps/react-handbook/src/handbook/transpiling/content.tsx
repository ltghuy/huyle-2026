import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { topicHref } from "@/practices/catalog";

import { CompilerDemo } from "./compiler-demo";
import { ErasableDemo } from "./erasable-demo";
import { JsxDemo } from "./jsx-demo";
import { LoweringDemo } from "./lowering-demo";
import { SourceMapDemo } from "./sourcemap-demo";

const TOPICS = [
  { id: "compiler", title: "Tokens, syntax trees and code generation" },
  { id: "types", title: "Stripping types is not checking them" },
  { id: "jsx", title: "What JSX becomes" },
  { id: "targets", title: "Targets: lowering syntax, polyfilling APIs" },
  { id: "source-maps", title: "Source maps" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title, linksLabel: "Read more:" };
}

export function TranspilingHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-3 text-foreground/85">
        <p>
          In{" "}
          <Link href={topicHref("build-pipeline")} className={inline}>
            From source to bundle
          </Link>{" "}
          the transform stage was one box: TypeScript and JSX go in, JavaScript comes out. This page opens it. Babel, SWC, Oxc, esbuild and TypeScript&apos;s own
          compiler all work the same way: <strong>scan</strong> the text into tokens, <strong>parse</strong> the tokens into a syntax tree,{" "}
          <strong>transform</strong> the tree, and <strong>print</strong> it back out as JavaScript with a source map.
        </p>
        <p>
          The first demo runs a small compiler written for this page, in your browser, on whatever you type. Its output was checked against TypeScript&apos;s.
          Everything labelled with a tool and version is that tool&apos;s real output.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            A compiler never works on text directly. The <strong>scanner</strong> (or lexer) cuts the characters into <strong>tokens</strong>: names, keywords,
            strings, punctuation. The <strong>parser</strong> arranges the tokens into an <strong>abstract syntax tree</strong> (AST) that records what the code
            means: this is a function, these are its parameters, this is its body. Transforms rewrite that tree, and <strong>code generation</strong> prints it.
          </>
        }
        points={[
          <>
            Whitespace and comments vanish at the first step, which is why output formatting is the printer&apos;s choice, not yours. Formatters such as Prettier
            parse your code and print the tree back the same way.
          </>,
          <>
            What a token is depends on context: in <code>&lt;p&gt;Hi there&lt;/p&gt;</code> the scanner reads text, not two names, and <code>/x/g</code> is a regular
            expression only where an expression can start. Real scanners are driven by the parser for exactly this reason.
          </>,
          <>
            Type annotations are ordinary nodes in the tree (<code>TSTypeAnnotation</code>, <code>TSTypeAliasDeclaration</code>…). Transpiling TypeScript is mostly
            deleting them.
          </>,
          <>
            The tree is the interface every tool shares. ESLint rules, codemods, Babel plugins and the React Compiler all read and rewrite ASTs; astexplorer.net shows
            the tree each real parser builds.
          </>,
          <>
            Unused imports that are only types are removed too: a per-file compiler can see that <code>ReactNode</code> is never used as a value in this file.
          </>,
        ]}
        demoTitle="edit a component and watch every stage"
        demo={<CompilerDemo />}
        advice={[
          {
            do: "Read the tree of a snippet in astexplorer.net before writing a lint rule or codemod: you match nodes, not text.",
            avoid: "Rewriting code with regular expressions: they can't tell a string from a name, or a type from a value.",
          },
        ]}
        links={[
          { label: "AST Explorer", href: "https://astexplorer.net/" },
          { label: "Babel plugin handbook", href: "https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md" },
          { label: "TypeScript compiler notes", href: "https://github.com/microsoft/TypeScript-Compiler-Notes" },
        ]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Babel, SWC, Oxc and esbuild compile <strong>one file at a time</strong> and never look at types. That is why they are fast, and why a type error never
            stops your dev server. Only a TypeScript <strong>program</strong> (<code>tsc</code>), which reads every file and its dependencies, can check types.
          </>
        }
        points={[
          <>
            Most TypeScript is <strong>erasable</strong>: delete the types and valid JavaScript is left. A few constructs (<code>enum</code>, <code>namespace</code>{" "}
            with values, constructor parameter properties) mean code must be <em>generated</em>, not just removed.
          </>,
          <>
            Node.js runs <code>.ts</code> files directly since 22.18 and 23.6 by replacing types with spaces; it rejects non-erasable syntax unless you pass{" "}
            <code>--experimental-transform-types</code>. TypeScript 5.8&apos;s <code>erasableSyntaxOnly</code> flags those constructs in your editor.
          </>,
          <>
            <code>isolatedModules</code> makes <code>tsc</code> report code that a per-file compiler can&apos;t handle correctly, such as re-exporting a type without{" "}
            <code>export type</code>. Turn it on whenever another tool does the compiling.
          </>,
          <>
            <code>import type</code> and <code>verbatimModuleSyntax</code> make the intent explicit, so every tool removes exactly the same imports.
          </>,
        ]}
        demoTitle="pick a construct and see what the real tools emit"
        demo={<ErasableDemo />}
        advice={[
          {
            do: <>Run <code>tsc --noEmit</code> in CI and in your editor; enable <code>isolatedModules</code> and, for new code, <code>erasableSyntaxOnly</code>.</>,
            avoid: <>Expecting the dev server or bundler to catch type errors, or using <code>const enum</code> across files with a per-file compiler.</>,
          },
        ]}
        links={[
          { label: "TypeScript: isolatedModules", href: "https://www.typescriptlang.org/tsconfig/#isolatedModules" },
          { label: "TypeScript: erasableSyntaxOnly", href: "https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly" },
          { label: "Node.js: Running TypeScript natively", href: "https://nodejs.org/api/typescript.html" },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            JSX is not HTML and not part of JavaScript: the compiler turns each element into a <strong>function call</strong> that returns a plain object describing
            it. Which function depends on the <strong>JSX runtime</strong> the compiler is set to.
          </>
        }
        points={[
          <>
            The <strong>classic</strong> runtime calls <code>React.createElement(type, props, ...children)</code>, which only works if <code>React</code> is in
            scope. That is why every component file used to start with <code>import React from &quot;react&quot;</code>.
          </>,
          <>
            The <strong>automatic</strong> runtime (React 17 and later, the default in every current tool) imports <code>jsx</code> and <code>jsxs</code> from{" "}
            <code>react/jsx-runtime</code> itself. Children travel inside props, and the key is a separate argument.
          </>,
          <>
            Lowercase tags become strings (<code>&quot;div&quot;</code>); capitalized ones stay variables (<code>Card</code>). That&apos;s the whole reason components
            must start with a capital letter.
          </>,
          <>
            Text between tags is trimmed line by line and joined with single spaces, so indenting JSX never adds stray whitespace to the page.
          </>,
          <>
            What these calls return, and what React does with it, is the subject of{" "}
            <Link href={topicHref("react-internals")} className={inline}>
              Inside React
            </Link>
            .
          </>,
        ]}
        demoTitle="switch runtimes and examples"
        demo={<JsxDemo />}
        advice={[
          {
            do: <>Use the automatic runtime (<code>&quot;jsx&quot;: &quot;react-jsx&quot;</code> in tsconfig) and drop unused <code>React</code> imports.</>,
            avoid: "Putting the key after a {...spread}: the compiler has to fall back to the slower createElement path.",
          },
        ]}
        links={[
          { label: "React: Introducing the new JSX transform", href: "https://legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html" },
          { label: "TypeScript: jsx option", href: "https://www.typescriptlang.org/tsconfig/#jsx" },
        ]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            A compiler&apos;s <strong>target</strong> is the oldest JavaScript it may emit. Syntax newer than the target is <strong>lowered</strong>: rewritten with
            older syntax that does the same thing. Bundlers usually derive the target from your <strong>browserslist</strong> query.
          </>
        }
        points={[
          <>
            Lowering costs bytes and speed: <code>async</code>/<code>await</code> for ES2015 becomes a generator-driven helper, and <code>a?.b</code> becomes temporary
            variables and <code>null</code> checks. Every modern browser supports ES2020+, so targeting older versions mostly ships dead weight.
          </>,
          <>
            Some features can&apos;t be lowered. <code>Array.prototype.at</code>, <code>structuredClone</code> or <code>Promise.withResolvers</code> are functions
            the browser provides, not syntax: the compiler leaves them alone, and old browsers need a <strong>polyfill</strong> that defines them at runtime.
          </>,
          <>
            Helpers such as <code>__awaiter</code> are inlined in every file that needs them unless you import them from a shared package (<code>tslib</code>,{" "}
            <code>@babel/runtime</code>, <code>@swc/helpers</code>).
          </>,
        ]}
        demoTitle="pick a feature and a target"
        demo={<LoweringDemo />}
        advice={[
          {
            do: "Set targets from real usage data (browserslist), and add polyfills only for the APIs you call.",
            avoid: "Targeting ES5 or ES2015 by habit: modern users download and run the lowered code too.",
          },
        ]}
        links={[
          { label: "browserslist", href: "https://browsersl.ist/" },
          { label: "web.dev: Serve modern code to modern browsers", href: "https://web.dev/articles/serve-modern-code-to-modern-browsers" },
          { label: "core-js", href: "https://github.com/zloirock/core-js" },
        ]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            After compiling, bundling and minifying, line 1 column 4,821 of a bundle means nothing to you. A <strong>source map</strong> is a JSON file that maps
            positions in the output back to files, lines and columns in your source, so the developer tools and error trackers can show your code instead.
          </>
        }
        points={[
          <>
            The <code>mappings</code> string holds one group per output line (separated by <code>;</code>) of segments (separated by <code>,</code>). Each segment
            is up to five numbers: output column, source file, source line, source column and name, each relative to the previous segment.
          </>,
          <>
            The numbers are <strong>base64 VLQ</strong>: 5 bits per character plus a continuation bit, sign in the lowest bit. Small relative numbers make most
            segments 4 characters long.
          </>,
          <>
            The output links to its map with a <code>{"//# sourceMappingURL="}</code> comment (or the <code>SourceMap</code> header). <code>sourcesContent</code>{" "}
            embeds the original files, so serving maps publicly also publishes your source.
          </>,
          <>
            Each tool in the chain produces a map, and the bundler composes them, so a minified line still points at your original <code>.tsx</code>.
          </>,
        ]}
        demoTitle="pick a segment and follow it back"
        demo={<SourceMapDemo />}
        advice={[
          {
            do: "Generate source maps for production builds and upload them to your error tracker.",
            avoid: "Serving maps with sourcesContent from a public server if your source is meant to stay private.",
          },
        ]}
        links={[
          { label: "ECMA-426: Source map format", href: "https://tc39.es/ecma426/" },
          { label: "web.dev: Source maps", href: "https://web.dev/articles/source-maps" },
          { label: "Source map visualizer", href: "https://evanw.github.io/source-map-visualization/" },
        ]}
      />
    </div>
  );
}

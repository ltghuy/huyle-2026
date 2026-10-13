// Which tool does each job in three common React setups. Facts checked
// against the official docs (see .artifacts/research/build-toolchains.md).

export type ToolchainId = "cra" | "vite" | "next";

export type JobId = "resolve" | "transform" | "typecheck" | "css" | "bundle" | "minify" | "serve" | "hot";

export const JOBS: readonly { id: JobId; title: string }[] = [
  { id: "resolve", title: "Resolve imports" },
  { id: "transform", title: "Transform TypeScript and JSX" },
  { id: "typecheck", title: "Type-check" },
  { id: "css", title: "Process CSS" },
  { id: "bundle", title: "Bundle" },
  { id: "minify", title: "Minify" },
  { id: "serve", title: "Serve" },
  { id: "hot", title: "Hot update" },
];

/** What a job uses in one mode. `none` marks a slot the setup leaves empty on purpose. */
export type Slot = { tool: string; none?: boolean; note?: string };

export type Toolchain = {
  id: ToolchainId;
  name: string;
  command: string;
  summary: string;
  deprecated?: string;
  jobs: Record<JobId, { dev: Slot; prod: Slot }>;
};

const NOT_IN_BUILD: Slot = { tool: "Not needed", none: true, note: "A production build has no running dev server." };

export const TOOLCHAINS: readonly Toolchain[] = [
  {
    id: "cra",
    name: "Create React App 5",
    command: "npx create-react-app",
    summary: "One package (react-scripts) that wraps webpack 5 and Babel with a fixed configuration.",
    deprecated: "Sunset by the React team on 14 February 2025: no new features, and new apps are pointed to a framework or to Vite, Parcel or Rsbuild.",
    jobs: {
      resolve: { dev: { tool: "webpack 5" }, prod: { tool: "webpack 5" } },
      transform: { dev: { tool: "Babel (babel-preset-react-app)" }, prod: { tool: "Babel (babel-preset-react-app)" } },
      typecheck: {
        dev: { tool: "fork-ts-checker-webpack-plugin", note: "Runs in a separate process and shows errors in the browser overlay." },
        prod: { tool: "fork-ts-checker-webpack-plugin", note: "A type error fails the build." },
      },
      css: {
        dev: { tool: "css-loader + PostCSS (+ sass-loader)", note: "style-loader injects each file as a <style> tag from JavaScript." },
        prod: { tool: "css-loader + PostCSS (+ sass-loader)", note: "mini-css-extract-plugin writes real .css files." },
      },
      bundle: { dev: { tool: "webpack 5, in memory" }, prod: { tool: "webpack 5, to build/" } },
      minify: { dev: { tool: "Not minified", none: true }, prod: { tool: "Terser (JS), cssnano (CSS)" } },
      serve: { dev: { tool: "webpack-dev-server" }, prod: { tool: "Any static file host", note: "The build is plain files." } },
      hot: { dev: { tool: "webpack HMR + React Fast Refresh" }, prod: NOT_IN_BUILD },
    },
  },
  {
    id: "vite",
    name: "Vite 8",
    command: "npm create vite@latest",
    summary: "A dev server that skips bundling your source, plus a production build on Rolldown. Since Vite 8, Rolldown and Oxc replace esbuild and Rollup.",
    jobs: {
      resolve: {
        dev: { tool: "Vite dev server, per request", note: "Rewrites bare imports such as react to the pre-bundled copy." },
        prod: { tool: "Rolldown" },
      },
      transform: { dev: { tool: "Oxc" }, prod: { tool: "Oxc" } },
      typecheck: {
        dev: { tool: "Not type-checked", none: true, note: "Vite only strips types; your editor checks them." },
        prod: { tool: "Not type-checked by Vite", none: true, note: "The template's build script runs tsc -b before vite build." },
      },
      css: {
        dev: { tool: "Built-in CSS + PostCSS / Sass if configured", note: "Injected from JavaScript so it can hot-update." },
        prod: { tool: "Built-in CSS + PostCSS / Sass if configured", note: "Extracted into .css files." },
      },
      bundle: {
        dev: { tool: "Source not bundled", none: true, note: "The browser loads each file as a native ES module; only dependencies are pre-bundled, by Rolldown." },
        prod: { tool: "Rolldown, to dist/" },
      },
      minify: { dev: { tool: "Not minified", none: true }, prod: { tool: "Oxc (JS), Lightning CSS (CSS)" } },
      serve: { dev: { tool: "Vite dev server" }, prod: { tool: "Any static file host", note: "The build is plain files." } },
      hot: { dev: { tool: "Vite HMR over a WebSocket + React Refresh" }, prod: NOT_IN_BUILD },
    },
  },
  {
    id: "next",
    name: "Next.js 16",
    command: "npx create-next-app@latest",
    summary: "A framework that builds client and server code in one graph. Turbopack is the default bundler for both next dev and next build; --webpack opts out.",
    jobs: {
      resolve: { dev: { tool: "Turbopack", note: "Lazily: only the routes you request." }, prod: { tool: "Turbopack" } },
      transform: { dev: { tool: "SWC" }, prod: { tool: "SWC" } },
      typecheck: {
        dev: { tool: "Not type-checked", none: true, note: "Turbopack doesn't check types; use your editor or tsc --watch." },
        prod: { tool: "tsc, in parallel with compilation", note: "A type error fails next build unless typescript.ignoreBuildErrors is set." },
      },
      css: { dev: { tool: "Lightning CSS + PostCSS if configured" }, prod: { tool: "Lightning CSS + PostCSS if configured", note: "Extracted into .css files." } },
      bundle: { dev: { tool: "Turbopack, bundles in dev too", note: "Bundling in dev avoids thousands of requests in large apps." }, prod: { tool: "Turbopack, to .next/" } },
      minify: { dev: { tool: "Not minified", none: true }, prod: { tool: "SWC minifier (JS)" } },
      serve: { dev: { tool: "next dev" }, prod: { tool: "next start (a Node server)", note: "Also renders pages on the server, unless you export a static site." } },
      hot: { dev: { tool: "Fast Refresh" }, prod: NOT_IN_BUILD },
    },
  },
];

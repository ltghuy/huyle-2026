// A four-file sample app and what a production build turns it into at each
// stage. Outputs are hand-written to match what the tools emit for this
// exact input (Babel/SWC-style JSX output, a webpack-style module map,
// scope-hoisted and minified code). React's own code is left out of every
// view, so the sizes shown cover the sample code only.

export type SampleFile = { name: string; code: string };

export const SOURCE: readonly SampleFile[] = [
  {
    name: "src/index.tsx",
    code: `import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);
`,
  },
  {
    name: "src/App.tsx",
    code: `import { formatPrice } from "./utils";

type Props = { price?: number };

export function App({ price = 42 }: Props) {
  if (process.env.NODE_ENV !== "production") {
    console.log("App rendered with", price);
  }
  return <p className="price">{formatPrice(price)}</p>;
}
`,
  },
  {
    name: "src/utils.ts",
    code: `export function formatPrice(value: number): string {
  return "$" + value.toFixed(2);
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\\s+/g, "-");
}
`,
  },
  {
    name: "src/styles.css",
    code: `.price {
  color: rebeccapurple;
  font-weight: 600;
}
`,
  },
];

export type Resolution = { from: string; specifier: string; resolved: string; how: string };

export const RESOLUTIONS: readonly Resolution[] = [
  { from: "(config)", specifier: "src/index.tsx", resolved: "src/index.tsx", how: "The entry point, from the build configuration." },
  { from: "src/index.tsx", specifier: "react-dom/client", resolved: "node_modules/react-dom/client.js", how: 'A bare package name: find react-dom in node_modules, then read the "./client" entry of its package.json "exports".' },
  { from: "src/index.tsx", specifier: "./App", resolved: "src/App.tsx", how: "Relative, without an extension: try the configured extensions in order until a file exists." },
  { from: "src/index.tsx", specifier: "./styles.css", resolved: "src/styles.css", how: "Relative, with an extension: the file itself. Not JavaScript, so it needs a CSS transform." },
  { from: "src/App.tsx", specifier: "./utils", resolved: "src/utils.ts", how: "Relative: .tsx doesn't exist, .ts does." },
  { from: "src/App.tsx, src/index.tsx", specifier: "react/jsx-runtime", resolved: "node_modules/react/jsx-runtime.js", how: "Added by the JSX transform, so it only appears after the file is transformed: resolving and transforming alternate, file by file." },
  { from: "react-dom/client.js", specifier: "react", resolved: "node_modules/react/index.js", how: "Dependencies have imports too; the graph keeps going into node_modules." },
];

export const GRAPH = `src/index.tsx  (entry)
├── react-dom/client  → node_modules/react-dom/client.js
│   └── react         → node_modules/react/index.js
├── react/jsx-runtime → node_modules/react/jsx-runtime.js
├── ./App             → src/App.tsx
│   ├── react/jsx-runtime  (already in the graph)
│   └── ./utils       → src/utils.ts
└── ./styles.css      → src/styles.css
`;

export const TRANSFORMED: readonly SampleFile[] = [
  {
    name: "src/index.tsx → JS",
    code: `import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
createRoot(document.getElementById("root")).render(/*#__PURE__*/_jsx(App, {}));
`,
  },
  {
    name: "src/App.tsx → JS",
    code: `import { jsx as _jsx } from "react/jsx-runtime";
import { formatPrice } from "./utils";
export function App({ price = 42 }) {
  if (process.env.NODE_ENV !== "production") {
    console.log("App rendered with", price);
  }
  return /*#__PURE__*/_jsx("p", {
    className: "price",
    children: formatPrice(price)
  });
}
`,
  },
  {
    name: "src/utils.ts → JS",
    code: `export function formatPrice(value) {
  return "$" + value.toFixed(2);
}
export function slugify(text) {
  return text.toLowerCase().replace(/\\s+/g, "-");
}
`,
  },
  {
    name: "src/styles.css → JS (dev)",
    code: `// In development the CSS becomes a module that injects a <style> tag.
// A production build extracts it into its own .css file instead.
const css = ".price {\\n  color: rebeccapurple;\\n  font-weight: 600;\\n}";
const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);
`,
  },
];

/** One file: every module wrapped in a function, linked by a tiny require(). */
export const BUNDLED = `(() => {
  var modules = {
    "./src/index.tsx": (module, exports, require) => {
      var _jsxRuntime = require("react/jsx-runtime");
      var _client = require("react-dom/client");
      var _App = require("./src/App.tsx");
      require("./src/styles.css");
      (0, _client.createRoot)(document.getElementById("root")).render(
        (0, _jsxRuntime.jsx)(_App.App, {})
      );
    },
    "./src/App.tsx": (module, exports, require) => {
      exports.App = App;
      var _jsxRuntime = require("react/jsx-runtime");
      var _utils = require("./src/utils.ts");
      function App({ price = 42 }) {
        if (process.env.NODE_ENV !== "production") {
          console.log("App rendered with", price);
        }
        return (0, _jsxRuntime.jsx)("p", {
          className: "price",
          children: (0, _utils.formatPrice)(price)
        });
      }
    },
    "./src/utils.ts": (module, exports) => {
      exports.formatPrice = formatPrice;
      exports.slugify = slugify;
      function formatPrice(value) {
        return "$" + value.toFixed(2);
      }
      function slugify(text) {
        return text.toLowerCase().replace(/\\s+/g, "-");
      }
    },
    "./src/styles.css": () => {
      /* injects the <style> tag */
    },
    "react/jsx-runtime": (module) => {
      /* React's own code, not shown */
    },
    "react-dom/client": (module) => {
      /* React DOM's own code, not shown */
    },
  };
  var cache = {};
  function require(id) {
    if (cache[id]) return cache[id].exports;
    var module = (cache[id] = { exports: {} });
    modules[id](module, module.exports, require);
    return module.exports;
  }
  require("./src/index.tsx");
})();
`;

/** After tree shaking, replacing the mode flag, dead-code removal and scope hoisting; before minifying. */
export const OPTIMIZED = `(() => {
  // React, react/jsx-runtime and react-dom/client are inlined here too (not shown)
  function formatPrice(value) {
    return "$" + value.toFixed(2);
  }
  function App({ price = 42 }) {
    return jsx("p", { className: "price", children: formatPrice(price) });
  }
  createRoot(document.getElementById("root")).render(jsx(App, {}));
})();
`;

/** The same code minified: whitespace gone, local names shortened. `t` is jsx and `e` is createRoot, inlined from React. */
export const MINIFIED = `(()=>{function n(r){return"$"+r.toFixed(2)}function o({price:r=42}){return t("p",{className:"price",children:n(r)})}e(document.getElementById("root")).render(t(o,{}))})();
`;

export const MINIFIED_CSS = `.price{color:#639;font-weight:600}
`;

export const OPTIMIZATIONS: readonly { title: string; detail: string }[] = [
  { title: "Tree shaking", detail: "slugify is exported but never imported, so it is dropped." },
  { title: "Replace the mode flag", detail: 'process.env.NODE_ENV becomes the string "production", so the check reads "production" !== "production".' },
  { title: "Remove dead code", detail: "That condition is always false, so the console.log branch is deleted." },
  { title: "Scope hoisting", detail: "ES modules are joined into one scope: no module map, no require() calls." },
  { title: "Minify", detail: "Whitespace and comments go, local names shrink to one letter, and the CSS color becomes #639." },
];

export function emittedHtml(jsName: string, cssName: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Sample</title>
    <link rel="stylesheet" href="/${cssName}" />
    <script type="module" src="/${jsName}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
}

export function sourceMap(jsName: string) {
  return `{
  "version": 3,
  "file": "${jsName.split("/").pop()}",
  "sources": ["../src/utils.ts", "../src/App.tsx", "../src/index.tsx"],
  "sourcesContent": ["export function formatPrice(value: number): string {…", "…", "…"],
  "names": ["formatPrice", "value", "App", "price"],
  "mappings": "…base64 VLQ segments: output position → source file, line, column…"
}
`;
}

/** The dev build's output: the module map plus an inline source map comment. */
export const DEV_OUTPUT = `${BUNDLED}//# sourceMappingURL=data:application/json;base64,…
`;

/** How the mode flag decides whether a branch survives, step by step. */
export function modeFlagSteps(mode: "development" | "production") {
  const kept = mode === "development";
  return [
    { label: "Source", code: 'if (process.env.NODE_ENV !== "production") { console.log(…) }' },
    { label: "Replace the flag", code: `if ("${mode}" !== "production") { console.log(…) }` },
    { label: "Fold the constant", code: `if (${kept}) { console.log(…) }` },
    { label: "Remove dead code", code: kept ? "console.log(…)  // kept: it always runs" : "// removed: it could never run" },
  ];
}

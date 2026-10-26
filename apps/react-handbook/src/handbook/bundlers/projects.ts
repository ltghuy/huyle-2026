// Sample projects for the bundler demos: virtual files keyed by path. Paths
// are relative to the project root; packages live under node_modules/.

export type Project = Record<string, string>;

/** A shop app: a shared module, a side-effect-only import and a lazy-loaded module. */
export const SHOP: Project = {
  "src/main.ts": `import { formatPrice } from "./format";
import { createCart } from "./cart";
import "./analytics";

console.log("main: running");
const cart = createCart();
cart.add(19.99);
cart.add(5);
console.log("main: total is", formatPrice(cart.total()));

export async function openHelp() {
  const { showHelp } = await import("./help");
  showHelp();
}
`,
  "src/format.ts": `console.log("format: running");

export function formatPrice(value: number): string {
  return "$" + value.toFixed(2);
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
`,
  "src/cart.ts": `import { formatPrice } from "./format";

console.log("cart: running");

export function createCart() {
  const items: number[] = [];
  return {
    add: (price: number) => {
      items.push(price);
      console.log("cart: added", formatPrice(price));
    },
    total: () => items.reduce((sum, price) => sum + price, 0),
  };
}
`,
  "src/analytics.ts": `console.log("analytics: page view sent");
`,
  "src/help.ts": `import { formatDate } from "./format";

console.log("help: running");

export function showHelp() {
  console.log("help: opened, docs updated", formatDate(new Date(0)));
}
`,
};

/** Two modules that import each other and read the other's value while it is still being evaluated. */
export const CIRCULAR: Project = {
  "src/a.ts": `import { b } from "./b";

console.log("a: running");
export const a = "A";
console.log("a: b is", b);
`,
  "src/b.ts": `import { a } from "./a";

console.log("b: running");
export const b = "B";
console.log("b: a is", a);
`,
};

/** Packages and files for the resolver: an exports map with conditions and a pattern, and an older package with only main fields. */
export const RESOLVE: Project = {
  "src/main.ts": `// The file the imports are resolved from.
`,
  "src/App.tsx": `export const App = () => null;
`,
  "src/utils/index.ts": `export const noop = () => {};
`,
  "node_modules/tiny-date/package.json": `{
  "name": "tiny-date",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "exports": {
    ".": {
      "browser": "./dist/browser.mjs",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./locale/*": "./dist/locale/*.mjs",
    "./package.json": "./package.json"
  }
}
`,
  "node_modules/tiny-date/dist/browser.mjs": `export const format = (d) => d.toLocaleDateString();
`,
  "node_modules/tiny-date/dist/index.mjs": `export const format = (d) => d.toISOString();
`,
  "node_modules/tiny-date/dist/index.cjs": `exports.format = (d) => d.toISOString();
`,
  "node_modules/tiny-date/dist/locale/fr.mjs": `export const months = ["janvier", "février"];
`,
  "node_modules/tiny-date/dist/internal.mjs": `export const secret = 1;
`,
  "node_modules/old-lib/package.json": `{
  "name": "old-lib",
  "main": "./lib/index.js",
  "module": "./es/index.js",
  "browser": "./lib/browser.js"
}
`,
  "node_modules/old-lib/lib/index.js": `exports.version = "1.0";
`,
  "node_modules/old-lib/lib/browser.js": `exports.version = "1.0-browser";
`,
  "node_modules/old-lib/es/index.js": `export const version = "1.0";
`,
};

/** An icon library behind a barrel file; each icon registers itself, a side effect the bundler can't prove harmless. */
export function treeShakeProject(options: { sideEffectsFalse: boolean; pure: boolean }): Project {
  return {
    "src/main.ts": `import { HomeIcon } from "icons";
import { formatPrice } from "./format";

console.log(HomeIcon(), formatPrice(3));
`,
    "src/format.ts": `function createRegistry() {
  return new Map<string, string>();
}

export const registry = ${options.pure ? "/*#__PURE__*/ " : ""}createRegistry();

export function formatPrice(value: number): string {
  return "$" + value.toFixed(2);
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
`,
    "node_modules/icons/package.json": `{
  "name": "icons",
  "module": "./index.js"${options.sideEffectsFalse ? ',\n  "sideEffects": false' : ""}
}
`,
    "node_modules/icons/index.js": `export { HomeIcon } from "./home.js";
export { CartIcon } from "./cart.js";
export { UserIcon } from "./user.js";
`,
    "node_modules/icons/registry.js": `export const icons = new Map();

export function registerIcon(name, render) {
  icons.set(name, render);
}
`,
    "node_modules/icons/home.js": `import { registerIcon } from "./registry.js";

export const HomeIcon = () => "[home icon]";
registerIcon("home", HomeIcon);
`,
    "node_modules/icons/cart.js": `import { registerIcon } from "./registry.js";

export const CartIcon = () => "[cart icon]";
registerIcon("cart", CartIcon);
`,
    "node_modules/icons/user.js": `import { registerIcon } from "./registry.js";

export const UserIcon = () => "[user icon]";
registerIcon("user", UserIcon);
`,
  };
}

/** A router with two lazy pages that share a chart module. */
export const SPLIT: Project = {
  "src/main.ts": `import { navigate } from "./router";

console.log("main: home page ready");

export const openAbout = () => navigate(() => import("./pages/about"));
export const openSettings = () => navigate(() => import("./pages/settings"));
`,
  "src/router.ts": `export async function navigate(load: () => Promise<{ render: () => void }>) {
  const page = await load();
  page.render();
}
`,
  "src/pages/about.ts": `import { drawChart } from "../chart";

export function render() {
  console.log("about:", drawChart([1, 2, 3]));
}
`,
  "src/pages/settings.ts": `import { drawChart } from "../chart";
import { formatPrice } from "../format";

export function render() {
  console.log("settings:", drawChart([4, 5]), "plan", formatPrice(9));
}
`,
  "src/chart.ts": `console.log("chart: running");

const PALETTE = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac"];

export function drawChart(points: number[]): string {
  const colors = points.map((_, i) => PALETTE[i % PALETTE.length]);
  return "chart of " + points.length + " points in " + colors.join(", ");
}
`,
  "src/format.ts": `export function formatPrice(value: number): string {
  return "$" + value.toFixed(2);
}
`,
};

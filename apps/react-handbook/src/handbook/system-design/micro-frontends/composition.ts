import { PIECES, piece, type PieceId } from "./store";

// Six ways to put the store's product page together, each with a simulated load
// timeline and the same six properties. The timings come from the assumptions
// below, not from measurements: they show the shape of each approach.

export type ApproachId = "route" | "build" | "server" | "edge" | "client" | "iframe";
export type PropertyId = "release" | "serverless" | "html" | "once" | "isolation" | "frameworks";
export type Level = "yes" | "partial" | "no";
export type StepKind = "network" | "server" | "script" | "data" | "render";

export type Step = { label: string; start: number; end: number; kind: StepKind };

export type Approach = {
  id: ApproachId;
  name: string;
  summary: string;
  properties: Record<PropertyId, { level: Level; note: string }>;
  steps: Step[];
  /** When the product details (the catalog piece) are first on screen. */
  firstContent: number;
  /** When the last piece can respond to input. */
  interactive: number;
  /** JavaScript downloaded for the page, in kB. */
  kb: number;
};

export const PROPERTIES: readonly { id: PropertyId; label: string }[] = [
  { id: "release", label: "Teams release independently" },
  { id: "serverless", label: "No composition server to run" },
  { id: "html", label: "Content in the first HTML" },
  { id: "once", label: "Shared libraries load once" },
  { id: "isolation", label: "Styles and scripts isolated" },
  { id: "frameworks", label: "Teams can mix frameworks" },
];

export const ASSUMPTIONS = {
  /** Browser to origin round trip, ms. */
  rtt: 100,
  /** Browser to CDN edge round trip, ms. */
  edgeRtt: 30,
  /** Download and parse time per kB of JavaScript, ms. */
  perKb: 2,
  /** A piece's data request from the browser, ms. */
  data: 150,
  /** Rendering or hydrating one piece, ms. */
  render: 30,
  /** Shared framework size, kB. */
  framework: 50,
} as const;

/** Server render time per piece's fragment, ms: account is personalised, so slowest. */
const SERVER_MS: Record<PieceId, number> = { shell: 60, catalog: 140, checkout: 120, account: 160 };

const A = ASSUMPTIONS;
const scriptMs = (kb: number) => A.rtt + kb * A.perKb;
const end = (steps: Step[]) => Math.max(...steps.map((s) => s.end));
const name = (id: PieceId) => piece(id).name;

/** Script + hydrate for each piece, all starting at `from`. */
function hydrateEach(from: number, ids: readonly PieceId[], frameworkCopies: 0 | 1 | "each"): Step[] {
  const steps: Step[] = [];
  let ready = from;
  if (frameworkCopies === 1) {
    const fw: Step = { label: "Shared framework", start: from, end: from + scriptMs(A.framework), kind: "script" };
    steps.push(fw);
    ready = fw.end;
  }
  for (const id of ids) {
    const kb = piece(id).kb + (frameworkCopies === "each" ? A.framework : 0);
    const script: Step = { label: `${name(id)} JS (${kb} kB)`, start: from, end: from + scriptMs(kb), kind: "script" };
    const start = Math.max(script.end, ready);
    steps.push(script, { label: `${name(id)} hydrates`, start, end: start + A.render, kind: "render" });
  }
  return steps;
}

function routeSteps(): Step[] {
  const doc: Step = { label: "Catalog app renders the whole page", start: 0, end: A.rtt + SERVER_MS.catalog, kind: "server" };
  const kb = A.framework + piece("catalog").kb + piece("shell").kb;
  const js: Step = { label: `Catalog app JS, header built in (${kb} kB)`, start: doc.end, end: doc.end + scriptMs(kb), kind: "script" };
  return [doc, js, { label: "Page hydrates", start: js.end, end: js.end + A.render, kind: "render" }];
}

function buildSteps(): Step[] {
  const doc: Step = { label: "One app renders every piece", start: 0, end: A.rtt + SERVER_MS.catalog + 40, kind: "server" };
  const kb = A.framework + PIECES.reduce((sum, p) => sum + p.kb, 0);
  const js: Step = { label: `One bundle with every piece (${kb} kB)`, start: doc.end, end: doc.end + scriptMs(kb), kind: "script" };
  return [doc, js, { label: "Page hydrates", start: js.end, end: js.end + A.render, kind: "render" }];
}

function serverSteps(): Step[] {
  const half = A.rtt / 2;
  const fragments: Step[] = PIECES.map((p) => ({ label: `${p.name} fragment`, start: half, end: half + 20 + SERVER_MS[p.id], kind: "server" }));
  const doc: Step = { label: "Composed HTML reaches the browser", start: end(fragments), end: end(fragments) + half, kind: "network" };
  return [...fragments, doc, ...hydrateEach(doc.end, PIECES.map((p) => p.id), 1)];
}

function edgeSteps(): Step[] {
  const half = A.edgeRtt / 2;
  const cached: Step[] = (["shell", "catalog"] as const).map((id) => ({ label: `${name(id)} fragment from edge cache`, start: half, end: half + 10, kind: "network" }));
  const doc: Step = { label: "Edge streams the composed HTML", start: end(cached), end: end(cached) + 20 + half, kind: "network" };
  const steps = [...cached, doc, ...hydrateEach(doc.end, ["shell", "catalog"], 1)];
  // Personalised pieces can't be cached, so the browser loads them afterwards.
  for (const id of ["checkout", "account"] as const) {
    const js: Step = { label: `${name(id)} JS (${piece(id).kb} kB)`, start: doc.end, end: doc.end + scriptMs(piece(id).kb), kind: "script" };
    const data: Step = { label: `${name(id)} data`, start: js.end, end: js.end + A.data, kind: "data" };
    steps.push(js, data, { label: `${name(id)} renders`, start: data.end, end: data.end + A.render, kind: "render" });
  }
  return steps;
}

function clientSteps(): Step[] {
  const doc: Step = { label: "Static shell HTML from the CDN", start: 0, end: A.rtt, kind: "network" };
  const shell: Step = { label: `Shell JS and shared framework (${piece("shell").kb + A.framework} kB)`, start: doc.end, end: doc.end + scriptMs(piece("shell").kb + A.framework), kind: "script" };
  const manifest: Step = { label: "Manifest of live versions", start: shell.end, end: shell.end + A.rtt, kind: "network" };
  const steps: Step[] = [doc, shell, manifest];
  for (const id of ["catalog", "checkout", "account"] as const) {
    const entry: Step = { label: `${name(id)} entry file`, start: manifest.end, end: manifest.end + A.rtt, kind: "network" };
    const code: Step = { label: `${name(id)} code (${piece(id).kb} kB)`, start: entry.end, end: entry.end + scriptMs(piece(id).kb), kind: "script" };
    const data: Step = { label: `${name(id)} data`, start: code.end, end: code.end + A.data, kind: "data" };
    steps.push(entry, code, data, { label: `${name(id)} renders`, start: data.end, end: data.end + A.render, kind: "render" });
  }
  return steps;
}

function iframeSteps(): Step[] {
  const doc: Step = { label: "Shell HTML with header", start: 0, end: A.rtt + SERVER_MS.shell, kind: "server" };
  const steps: Step[] = [doc];
  for (const id of ["catalog", "checkout", "account"] as const) {
    const frame: Step = { label: `${name(id)} frame document`, start: doc.end, end: doc.end + A.rtt + SERVER_MS[id], kind: "server" };
    const kb = piece(id).kb + A.framework;
    const js: Step = { label: `${name(id)} JS, own framework copy (${kb} kB)`, start: frame.end, end: frame.end + scriptMs(kb), kind: "script" };
    steps.push(frame, js, { label: `${name(id)} hydrates`, start: js.end, end: js.end + A.render, kind: "render" });
  }
  return steps;
}

function finish(steps: Step[], content: (s: Step) => boolean, kb: number) {
  return { steps, firstContent: steps.filter(content).reduce((t, s) => Math.max(t, s.end), 0), interactive: end(steps), kb };
}

const TEAM_KB = PIECES.reduce((sum, p) => sum + p.kb, 0);

export const APPROACHES: readonly Approach[] = [
  {
    id: "route",
    name: "Route-level split",
    summary: "Each team ships a whole app for its paths; a router or proxy sends /products to catalog and /cart to checkout. Pieces never share a page.",
    properties: {
      release: { level: "yes", note: "Each app deploys on its own." },
      serverless: { level: "partial", note: "Needs path-based routing in front, which most hosts and CDNs provide." },
      html: { level: "yes", note: "Each app server-renders its own pages." },
      once: { level: "partial", note: "Only one app per page, so nothing loads twice there, but moving between apps is a full page load." },
      isolation: { level: "yes", note: "Separate pages: nothing can collide." },
      frameworks: { level: "yes", note: "Each app picks its own." },
    },
    ...finish(routeSteps(), (s) => s.label.startsWith("Catalog app renders"), A.framework + piece("catalog").kb + piece("shell").kb),
  },
  {
    id: "build",
    name: "Build-time packages",
    summary: "Each team publishes a package; the shell installs them and ships one app. Simple, but a new version only goes live when the shell rebuilds.",
    properties: {
      release: { level: "no", note: "The shell must bump the package, rebuild and redeploy." },
      serverless: { level: "yes", note: "It is one ordinary app." },
      html: { level: "yes", note: "One app, server-rendered as usual." },
      once: { level: "yes", note: "The bundler deduplicates shared libraries." },
      isolation: { level: "no", note: "One document and one bundle: conventions only." },
      frameworks: { level: "no", note: "Everything compiles into one app." },
    },
    ...finish(buildSteps(), (s) => s.kind === "server", A.framework + TEAM_KB),
  },
  {
    id: "server",
    name: "Server-side composition",
    summary: "A composition server fetches each team's HTML fragment in parallel and stitches them into one document, then each piece hydrates.",
    properties: {
      release: { level: "yes", note: "Each team deploys its fragment service." },
      serverless: { level: "no", note: "Someone runs and scales the composition layer." },
      html: { level: "yes", note: "The browser gets the whole page, but only after the slowest fragment." },
      once: { level: "partial", note: "Only if pieces agree on shared script URLs." },
      isolation: { level: "partial", note: "One document: needs prefixed or scoped CSS." },
      frameworks: { level: "yes", note: "Fragments are HTML; each hydrates with its own code." },
    },
    ...finish(serverSteps(), (s) => s.label === "Composed HTML reaches the browser", A.framework + TEAM_KB),
  },
  {
    id: "edge",
    name: "Edge composition",
    summary: "The CDN assembles cacheable fragments close to the user; personalised pieces (cart, recently viewed) load in the browser afterwards.",
    properties: {
      release: { level: "yes", note: "Fragments and scripts deploy separately." },
      serverless: { level: "partial", note: "Runs on the CDN (includes or edge functions), not your own servers." },
      html: { level: "partial", note: "Cached pieces are in the HTML; personalised ones arrive later." },
      once: { level: "partial", note: "Only if pieces agree on shared script URLs." },
      isolation: { level: "partial", note: "One document: needs prefixed or scoped CSS." },
      frameworks: { level: "yes", note: "As with server composition." },
    },
    ...finish(edgeSteps(), (s) => s.label === "Edge streams the composed HTML", A.framework + TEAM_KB),
  },
  {
    id: "client",
    name: "Client-side runtime",
    summary: "The browser loads the shell, reads a manifest, then loads each piece's code from its own URL at runtime and shares libraries between them.",
    properties: {
      release: { level: "yes", note: "Update the manifest and the next page load picks up the new version." },
      serverless: { level: "yes", note: "Static files on a CDN." },
      html: { level: "no", note: "Content appears after several round trips, unless server rendering is added on top." },
      once: { level: "yes", note: "The runtime negotiates one copy of shared libraries." },
      isolation: { level: "partial", note: "Possible with shadow DOM or scoped CSS, not by default." },
      frameworks: { level: "partial", note: "Possible, but every framework is another download." },
    },
    ...finish(clientSteps(), (s) => s.label === "Catalog renders", A.framework + TEAM_KB),
  },
  {
    id: "iframe",
    name: "Iframes",
    summary: "Each piece is its own document in a frame. Total isolation, at the price of sizing, routing, accessibility and a framework copy per frame.",
    properties: {
      release: { level: "yes", note: "Each frame's app deploys on its own." },
      serverless: { level: "yes", note: "Each frame is an ordinary app." },
      html: { level: "partial", note: "Content lives in other documents, which search engines and screen readers treat as separate pages." },
      once: { level: "no", note: "Every frame loads its own copy of everything." },
      isolation: { level: "yes", note: "Separate documents: the strongest isolation there is." },
      frameworks: { level: "yes", note: "Each frame is independent." },
    },
    ...finish(iframeSteps(), (s) => s.label === "Catalog frame document", 3 * A.framework + TEAM_KB),
  },
];

const BY_ID = new Map(APPROACHES.map((a) => [a.id, a]));

export function approach(id: ApproachId): Approach {
  return BY_ID.get(id)!;
}

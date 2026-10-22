// Picking a rendering strategy from what a page needs. A teaching model: real
// pages mix strategies per component, which the "split" answer shows.

export type Search = "yes" | "no";
export type Personal = "no" | "partly" | "yes";
export type Freshness = "rarely" | "hourly" | "request";

export type Answers = { search: Search; personal: Personal; freshness: Freshness };

export type Strategy = { name: string; why: string; code: string; cost: string };

const STATIC: Strategy = {
  name: "Static generation",
  why: "The HTML is built once and served from the CDN, complete, to every visitor and crawler. Nothing to wait for and nothing to render per request.",
  code: "// The default for a route with no request-time data.\nexport function generateStaticParams() {\n  return posts.map((p) => ({ slug: p.slug }));\n}",
  cost: "A rebuild or deploy to change the content. This site's handbook pages work this way.",
};

const REVALIDATE: Strategy = {
  name: "Static with revalidation",
  why: "Crawlers still get complete HTML from the cache, and the page is rebuilt in the background at most once per interval.",
  code: "// Rebuild this page at most once an hour.\nexport const revalidate = 3600;",
  cost: "Visitors can see content up to one interval old.",
};

const SERVER: Strategy = {
  name: "Server rendering on each request",
  why: "The HTML is complete and current on every request, which matters when it changes faster than any cache could keep up.",
  code: "import { connection } from \"next/server\";\n\nexport default async function Page() {\n  await connection(); // render at request time\n  // ...\n}",
  cost: "Server work and a slower first byte on every request; stream slow parts with <Suspense> so the shell arrives first.",
};

const SPLIT: Strategy = {
  name: "Split: public part on the server, personal part in the browser",
  why: "Crawlers never see personal content (they aren't logged in), so render what should rank in the server HTML and fetch the personal parts in the browser.",
  code: "// Static or revalidated page...\nexport const revalidate = 3600;\n\n// ...with a client component for the signed-in parts.\n<Recommendations /> // \"use client\", fetches after mount",
  cost: "Two data paths to maintain; keep the personal parts small so the layout doesn't jump.",
};

const CLIENT: Strategy = {
  name: "Client rendering",
  why: "The page doesn't need to appear in search (a dashboard behind a login), so a fast interactive app matters more than complete first HTML.",
  code: "\"use client\";\n// Fetch after mount; send noindex or keep the route behind a login.",
  cost: "Crawlers see an empty shell, which is fine here. Keep the login page itself server-rendered if it should rank.",
};

export function recommend({ search, personal, freshness }: Answers): Strategy {
  if (search === "no") return personal === "no" ? { ...STATIC, why: `${STATIC.why} Even without search, it's the cheapest way to serve the same page to everyone.` } : CLIENT;
  if (personal !== "no") return SPLIT;
  if (freshness === "rarely") return STATIC;
  if (freshness === "hourly") return REVALIDATE;
  return SERVER;
}

export const STRATEGY_ROWS = [
  { name: "Client rendering", html: "An empty shell", server: "None", fresh: "Live", search: "Only crawlers that render" },
  { name: "Server rendering", html: "Complete", server: "Every request", fresh: "Live", search: "Good" },
  { name: "Static generation", html: "Complete", server: "At build", fresh: "Until the next build", search: "Best" },
  { name: "Static with revalidation", html: "Complete", server: "Once per interval", fresh: "Up to one interval old", search: "Best" },
] as const;

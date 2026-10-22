// The path from a URL to a search result, as Google documents it, and the
// first stage a page with the chosen conditions stops at. Report reasons are
// the Page indexing report's names, verbatim (see
// .artifacts/research/seo-fundamentals.md).

export type StageId = "discover" | "crawl" | "render" | "index" | "serve";

export type Stage = { id: StageId; title: string; does: string; control: string };

export const STAGES: readonly Stage[] = [
  {
    id: "discover",
    title: "Discover",
    does: "The crawler learns the URL exists, from a link on a page it knows or from a sitemap.",
    control: "Crawlable links and the sitemap.",
  },
  {
    id: "crawl",
    title: "Crawl",
    does: "The crawler checks robots.txt, then fetches the URL and reads the status code and HTML.",
    control: "robots.txt rules, status codes, redirects and server speed.",
  },
  {
    id: "render",
    title: "Render",
    does: "The page runs in a recent Chrome so content added by JavaScript is seen.",
    control: "What's in the HTML before scripts run, and scripts that work for the crawler.",
  },
  {
    id: "index",
    title: "Index",
    does: "The content is read, grouped with duplicates, one canonical URL is picked, and it's stored.",
    control: "noindex, canonical URLs and content worth indexing.",
  },
  {
    id: "serve",
    title: "Serve",
    does: "For each search, matching indexed pages are ranked for that query and that searcher.",
    control: "Titles, descriptions, structured data and how useful the page is.",
  },
];

export type Status = "200" | "301" | "404" | "500";

export type ConditionId = "orphan" | "robots" | "soft404" | "jsContent" | "noindex" | "canonical" | "duplicate" | "thin";

export type Condition = { id: ConditionId; stage: StageId; label: string; detail: string };

export const CONDITIONS: readonly Condition[] = [
  { id: "orphan", stage: "discover", label: "No links to it, not in the sitemap", detail: "An orphan page." },
  { id: "robots", stage: "crawl", label: "Blocked in robots.txt", detail: "Disallow: /seo/" },
  { id: "soft404", stage: "render", label: "Says \"not found\" with a 200 status", detail: "An empty search result page, say." },
  { id: "jsContent", stage: "render", label: "Main content needs JavaScript", detail: "The HTML is an empty shell until scripts run." },
  { id: "noindex", stage: "index", label: "Has a noindex tag", detail: '<meta name="robots" content="noindex">' },
  { id: "canonical", stage: "index", label: "Canonical points to another URL", detail: '<link rel="canonical" href="/other">' },
  { id: "duplicate", stage: "index", label: "Near copy of another page, no canonical", detail: "The same text under a second URL." },
  { id: "thin", stage: "index", label: "Little that other pages don't already say", detail: "Thin or repeated content." },
];

export const STATUS_OPTIONS: readonly { value: Status; label: string }[] = [
  { value: "200", label: "200 OK" },
  { value: "301", label: "301 redirect" },
  { value: "404", label: "404 not found" },
  { value: "500", label: "500 server error" },
];

type Stop = { stage: StageId; cause: string; reason: string | null; fix: string };

export type StageResult = { id: StageId; state: "pass" | "stop" | "skip" };

export type PipelineResult = {
  stages: StageResult[];
  stop: Stop | null;
  /** Conditions the crawler never got far enough to see. */
  unreached: string[];
  notes: string[];
};

const STATUS_STOP: Record<Exclude<Status, "200">, Omit<Stop, "stage">> = {
  "301": {
    cause: "The URL redirects.",
    reason: "Page with redirect",
    fix: "Nothing, if the redirect is meant: the target URL is crawled and indexed instead. Link to the target directly so crawlers skip the hop.",
  },
  "404": {
    cause: "The server says the page doesn't exist.",
    reason: "Not found (404)",
    fix: "Restore the page, or redirect the URL to its closest replacement. A 404 for a page that is really gone is correct.",
  },
  "500": {
    cause: "The server failed to answer.",
    reason: "Server error (5xx)",
    fix: "Fix the server error. Google slows down crawling a site that keeps failing, and retries later.",
  },
};

const CONDITION_STOP: Partial<Record<ConditionId, Omit<Stop, "stage">>> = {
  orphan: {
    cause: "Nothing points to the URL, so the crawler never learns it exists.",
    reason: null,
    fix: "Link to it with an <a href> from a page that is crawled, or list it in the sitemap.",
  },
  robots: {
    cause: "robots.txt forbids fetching the URL, so the crawler never reads the page.",
    reason: "URL blocked by robots.txt",
    fix: "Remove the Disallow rule if the page belongs in search. To keep it out, allow crawling and add noindex instead.",
  },
  soft404: {
    cause: "The page looks like an error page but the server says 200 OK.",
    reason: "Soft 404",
    fix: "Return a 404 or 410 status for missing content, or give the page real content.",
  },
  noindex: {
    cause: "The page asks not to be indexed.",
    reason: "URL marked ‘noindex’",
    fix: "Remove noindex if the page belongs in search. If it's meant, nothing to do.",
  },
  canonical: {
    cause: "The page names another URL as the one to show.",
    reason: "Alternate page with proper canonical tag",
    fix: "Nothing, if the other URL is the one you want in results. Otherwise point the canonical at this page.",
  },
  duplicate: {
    cause: "Google grouped it with a near copy and picked the other URL itself.",
    reason: "Duplicate without user-selected canonical",
    fix: "Choose the URL to show: add rel=\"canonical\" pointing to it, or redirect the copies.",
  },
  thin: {
    cause: "The page was read, but not judged worth a place in the index yet.",
    reason: "Crawled - currently not indexed",
    fix: "Make the page more useful than the pages it repeats, and link to it from related pages. Google may index it later.",
  },
};

const ORDER: readonly StageId[] = STAGES.map((s) => s.id);

/** Runs the conditions through the stages in order and stops at the first one that blocks. */
export function runPipeline(conditions: ReadonlySet<ConditionId>, status: Status): PipelineResult {
  const blockers: { stage: StageId; key: string; stop: Omit<Stop, "stage"> }[] = [];
  for (const c of CONDITIONS) {
    const stop = CONDITION_STOP[c.id];
    if (conditions.has(c.id) && stop) blockers.push({ stage: c.stage, key: c.label, stop });
  }
  if (status !== "200") blockers.push({ stage: "crawl", key: STATUS_OPTIONS.find((o) => o.value === status)!.label, stop: STATUS_STOP[status] });
  // Within a stage, robots.txt is read before the fetch, so it wins over the status code.
  blockers.sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage));

  const first = blockers[0];
  const stopAt = first ? ORDER.indexOf(first.stage) : -1;
  const stages = ORDER.map((id, i): StageResult => ({ id, state: stopAt === -1 || i < stopAt ? "pass" : i === stopAt ? "stop" : "skip" }));

  const notes: string[] = [];
  if (conditions.has("robots") && conditions.has("noindex")) {
    notes.push(
      "The noindex tag is never read: the crawler isn't allowed to fetch the page. If other sites link to the URL, it can still be indexed without a description (\"Indexed, though blocked by robots.txt\").",
    );
  }
  if (conditions.has("jsContent") && (stopAt === -1 || stopAt > ORDER.indexOf("render"))) {
    notes.push(
      "Google renders the page, so the content is usually seen, though rendering can wait in a queue. Crawlers that don't run JavaScript, including many AI crawlers, see the empty shell.",
    );
  }
  if (conditions.has("canonical") && conditions.has("noindex")) {
    notes.push("noindex with a canonical to another URL sends mixed signals. Pick one: noindex to drop the page, or canonical to merge it.");
  }

  return {
    stages,
    stop: first ? { stage: first.stage, ...first.stop } : null,
    unreached: blockers.slice(1).map((b) => b.key),
    notes,
  };
}

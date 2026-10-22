// Common situations and the status code each should send (behaviour from
// Google's "HTTP status codes and network errors" page).

export type Code = "200" | "permanent" | "temporary" | "gone" | "later";

export const CODE_LABEL: Record<Code, string> = {
  "200": "200",
  permanent: "301 / 308",
  temporary: "302 / 307",
  gone: "404 / 410",
  later: "503 / 429",
};

export type Situation = { id: string; text: string; answer: Code; reason: string; google: string; next: string };

export const SITUATIONS: readonly Situation[] = [
  {
    id: "moved",
    text: "An article moved to a new URL for good.",
    answer: "permanent",
    reason: "The old URL won't come back, and its links and signals should move to the new one.",
    google: "A strong signal that the target should be indexed instead.",
    next: "permanentRedirect(\"/new\") in the page, or a redirect with permanent: true in next.config (sends 308).",
  },
  {
    id: "sale",
    text: "For one week, the shop's home page sends visitors to a sale page.",
    answer: "temporary",
    reason: "The original page comes back, so it should stay the indexed URL.",
    google: "A weak signal: the original usually stays in the index.",
    next: "redirect(\"/sale\") (sends 307), or a redirect with permanent: false in next.config.",
  },
  {
    id: "deleted",
    text: "A product was discontinued and nothing replaces it.",
    answer: "gone",
    reason: "The page is gone. Saying so lets crawlers drop it instead of retrying.",
    google: "All 4xx codes except 429 are treated alike: the URL is removed from the index and crawled less.",
    next: "notFound() (404, and Next.js adds noindex). For 410, return it from a route handler or proxy.",
  },
  {
    id: "replaced",
    text: "A product was discontinued and a newer model replaces it.",
    answer: "permanent",
    reason: "People and links looking for the old model are best served by the new one. Redirecting everything to the home page instead looks like a soft 404.",
    google: "The replacement inherits the old URL's signals.",
    next: "A permanent redirect in next.config, or permanentRedirect() where the lookup happens.",
  },
  {
    id: "search",
    text: "The site's own search results page for any query.",
    answer: "200",
    reason: "It works, so it's a 200. It shouldn't be indexed though: add noindex so endless query URLs stay out of search.",
    google: "With noindex, the page is crawled for its links but kept out of results.",
    next: "Return the page normally, with robots: { index: false } in its metadata.",
  },
  {
    id: "maintenance",
    text: "The site is down for an hour of planned maintenance.",
    answer: "later",
    reason: "A 503 with a Retry-After header says \"come back later\". A 200 maintenance page would replace every page's content.",
    google: "Crawling slows and resumes when pages answer 2xx again; a short outage doesn't drop pages.",
    next: "Return 503 from proxy (or a route handler) with a Retry-After header.",
  },
  {
    id: "scheme",
    text: "Every URL changes from /blog/:slug to /articles/:slug.",
    answer: "permanent",
    reason: "One permanent redirect per old URL, straight to its final address. Chains through older schemes waste crawls; Google follows up to 10 hops.",
    google: "Signals move to the new URLs over the following weeks.",
    next: "{ source: \"/blog/:slug\", destination: \"/articles/:slug\", permanent: true } in next.config redirects.",
  },
];

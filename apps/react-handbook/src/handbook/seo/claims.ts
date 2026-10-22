// Common SEO claims, each answered from a primary source (quotes in
// .artifacts/research/seo-fundamentals.md).

export type Verdict = "signal" | "myth" | "depends";

export const VERDICT_LABEL: Record<Verdict, string> = { signal: "Signal", myth: "Myth", depends: "It depends" };

export type Claim = { id: string; claim: string; answer: Verdict; reason: string; source: { label: string; href: string } };

const STARTER = "https://developers.google.com/search/docs/fundamentals/seo-starter-guide";

export const CLAIMS: readonly Claim[] = [
  {
    id: "keywords-meta",
    claim: "Filling in the keywords meta tag helps a page rank.",
    answer: "myth",
    reason: "Google Search doesn't use the keywords meta tag at all.",
    source: { label: "Google: SEO starter guide", href: STARTER },
  },
  {
    id: "word-count",
    claim: "A page needs at least a set number of words to rank.",
    answer: "myth",
    reason: "Google says the length of the content alone doesn't matter for ranking. A short page that answers the query can outrank a long one.",
    source: { label: "Google: SEO starter guide", href: STARTER },
  },
  {
    id: "cwv",
    claim: "Core Web Vitals affect rankings.",
    answer: "signal",
    reason: "They are used by Google's ranking systems, but relevance comes first: Google still shows the most relevant page even when its page experience is poor.",
    source: { label: "Google: page experience", href: "https://developers.google.com/search/docs/appearance/page-experience" },
  },
  {
    id: "https",
    claim: "Serving the site over HTTPS helps.",
    answer: "signal",
    reason: "Google announced HTTPS as a lightweight ranking signal in 2014, and prefers the HTTPS URL as the canonical when both exist.",
    source: { label: "Google: HTTPS as a ranking signal", href: "https://developers.google.com/search/blog/2014/08/https-as-ranking-signal" },
  },
  {
    id: "domain",
    claim: "A domain with the keyword in it ranks higher.",
    answer: "myth",
    reason: "Keywords in the domain or URL path alone have hardly any effect beyond showing in breadcrumbs.",
    source: { label: "Google: SEO starter guide", href: STARTER },
  },
  {
    id: "nofollow",
    claim: "A nofollow link is always ignored.",
    answer: "depends",
    reason: "Since 2019 Google treats nofollow, sponsored and ugc as hints. It may use such a link for discovery or ranking, or it may not.",
    source: { label: "Google: evolving nofollow", href: "https://developers.google.com/search/blog/2019/09/evolving-nofollow-new-ways-to-identify" },
  },
  {
    id: "eeat",
    claim: "E-E-A-T is a ranking factor.",
    answer: "myth",
    reason: "E-E-A-T is the framework quality raters use to judge results. Google says plainly it isn't a ranking factor itself, though its systems aim for the same kind of helpful, trustworthy content.",
    source: { label: "Google: SEO starter guide", href: STARTER },
  },
  {
    id: "headings",
    claim: "Headings out of order hurt rankings.",
    answer: "myth",
    reason: "Google says the order and number of headings don't matter for ranking. Order still matters for screen reader users, which is reason enough to keep it.",
    source: { label: "Google: SEO starter guide", href: STARTER },
  },
  {
    id: "links",
    claim: "Links from other sites help a page rank.",
    answer: "signal",
    reason: "Links help discovery and are one ranking signal among many (PageRank is still used). One link from a relevant site counts for more than many from unrelated ones.",
    source: { label: "Google: SEO starter guide", href: STARTER },
  },
  {
    id: "robots-remove",
    claim: "Disallowing a page in robots.txt removes it from Google.",
    answer: "myth",
    reason: "robots.txt stops crawling, not indexing. A blocked URL can still appear in results, without a description. Use noindex, or a password, to keep it out.",
    source: { label: "Google: robots.txt introduction", href: "https://developers.google.com/search/docs/crawling-indexing/robots/intro" },
  },
];

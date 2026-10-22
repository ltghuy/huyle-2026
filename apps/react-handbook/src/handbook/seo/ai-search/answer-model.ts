import { practiceHref, practices, topicHref, topicPages } from "@/practices/catalog";

// A simplified model of an AI answer, built on this site's pages. It splits a
// question into related searches (query fan-out), matches pages by the words
// of their title and summary, and cites the best three each engine may use.
// Real systems rank with their full search index and quality signals.

export type IndexedPage = { path: string; title: string; text: string };

export const PAGES: readonly IndexedPage[] = [
  ...practices.filter((p) => p.built).map((p) => ({ path: practiceHref(p.slug), title: p.title, text: `${p.title} ${p.summary}`.toLowerCase() })),
  ...topicPages.filter((p) => p.written).map((p) => ({ path: topicHref(p.slug), title: p.title, text: `${p.title} ${p.summary}`.toLowerCase() })),
];

const STOP = new Set(
  "a an and are as at be by can do does for from how i in is it my of on or should that the this to use what when where which who why with you your".split(" "),
);

/** The question's key terms, without small words or a plural "s". */
export function terms(question: string) {
  const words = question
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .map((w) => w.replace(/\.$/, ""))
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w));
  return [...new Set(words)].slice(0, 5);
}

/** The question itself plus one search per pair of key terms, up to four. */
export function fanOut(question: string, keyTerms: string[]) {
  const pairs: string[] = [];
  for (let i = 0; i < keyTerms.length; i++) for (let j = i + 1; j < keyTerms.length; j++) pairs.push(`${keyTerms[i]} ${keyTerms[j]}`);
  return [question.trim(), ...pairs.slice(0, 3)];
}

export type Match = { page: IndexedPage; score: number; terms: string[] };

/** A term matches a whole word, or the start of a longer word ("crawler" matches "crawlers"). */
function hasTerm(words: string[], term: string) {
  return words.some((w) => w === term || (term.length >= 4 && w.startsWith(term)));
}

export function match(keyTerms: string[]): Match[] {
  return PAGES.map((page) => {
    const words = page.text.split(/[^a-z0-9.]+/).map((w) => w.replace(/\.$/, ""));
    const hit = keyTerms.filter((t) => hasTerm(words, t));
    return { page, score: hit.length, terms: hit };
  })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title))
    .slice(0, 6);
}

export type SiteRules = { googlebot: boolean; oaiSearch: boolean; claudeSearch: boolean; gptbot: boolean };

export type PageRules = { noindex: boolean; nosnippet: boolean };

export type EngineId = "google" | "chatgpt" | "claude";

export const ENGINES: { id: EngineId; name: string }[] = [
  { id: "google", name: "Google AI Overview" },
  { id: "chatgpt", name: "ChatGPT search" },
  { id: "claude", name: "Claude with web search" },
];

/** Why an engine can't use a page, or null when it can. GPTBot is a training crawler, so it plays no part. */
export function blocker(engine: EngineId, site: SiteRules, page: PageRules): string | null {
  if (engine === "google") {
    if (!site.googlebot) return "Googlebot is disallowed, so the page isn't in Google's index";
    if (page.noindex) return "noindex keeps it out of Google's index";
    if (page.nosnippet) return "nosnippet: AI features only use pages that may show a snippet";
    return null;
  }
  if (engine === "chatgpt") return site.oaiSearch ? null : "OAI-SearchBot is disallowed";
  return site.claudeSearch ? null : "Claude-SearchBot is disallowed";
}

export type Answer = { engine: (typeof ENGINES)[number]; cited: Match[]; excluded: { match: Match; why: string }[] };

export function answers(matches: Match[], site: SiteRules, rules: Record<string, PageRules>): Answer[] {
  return ENGINES.map((engine) => {
    const cited: Match[] = [];
    const excluded: Answer["excluded"] = [];
    for (const m of matches) {
      const why = blocker(engine.id, site, rules[m.page.path] ?? { noindex: false, nosnippet: false });
      if (why) excluded.push({ match: m, why });
      else if (cited.length < 3) cited.push(m);
      else excluded.push({ match: m, why: "a weaker match than the three cited" });
    }
    return { engine, cited, excluded };
  });
}

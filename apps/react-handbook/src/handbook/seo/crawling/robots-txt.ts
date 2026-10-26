// A robots.txt parser and matcher that follows Google's documented rules:
// the most specific matching user-agent group (groups for the same agent are
// combined, "*" is the fallback), then the longest matching rule path, with
// the less restrictive rule winning a tie. `*` matches any run of characters
// and a trailing `$` anchors the end. Percent-encoding isn't normalised.

export type RobotsRule = { allow: boolean; path: string; line: number };

export type RobotsGroup = { agents: string[]; rules: RobotsRule[]; line: number };

export type ParsedRobots = { groups: RobotsGroup[]; sitemaps: string[]; ignored: { line: number; text: string; why: string }[] };

const IGNORED_KEYS: Record<string, string> = {
  "crawl-delay": "Google ignores crawl-delay; Bing and some others read it.",
  host: "Not part of the standard.",
  noindex: "Google stopped reading noindex in robots.txt in 2019.",
};

export function parseRobots(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  const ignored: ParsedRobots["ignored"] = [];
  let current: RobotsGroup | null = null;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const content = raw.replace(/#.*$/, "").trim();
    if (content === "") return;
    const colon = content.indexOf(":");
    if (colon === -1) {
      ignored.push({ line, text: raw.trim(), why: "No colon, so it isn't a field." });
      return;
    }
    const key = content.slice(0, colon).trim().toLowerCase();
    const value = content.slice(colon + 1).trim();

    if (key === "user-agent") {
      // Consecutive user-agent lines share one group.
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [], line };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "allow" || key === "disallow") {
      if (!current) ignored.push({ line, text: raw.trim(), why: "A rule before any user-agent line belongs to no group." });
      // An empty Disallow allows everything: it adds no rule.
      else if (value !== "") current.rules.push({ allow: key === "allow", path: value, line });
    } else if (key === "sitemap") {
      sitemaps.push(value);
    } else {
      ignored.push({ line, text: raw.trim(), why: IGNORED_KEYS[key] ?? `Unknown field "${key}".` });
    }
  });

  return { groups, sitemaps, ignored };
}

function toRegExp(path: string) {
  const anchored = path.endsWith("$");
  const body = (anchored ? path.slice(0, -1) : path)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

export type RobotsVerdict = {
  allowed: boolean;
  /** The groups whose rules applied, or none when no group matches. */
  groups: RobotsGroup[];
  matchedAgent: string | null;
  rule: RobotsRule | null;
  /** Every rule that matched the path, longest first. */
  candidates: RobotsRule[];
};

export function checkRobots(parsed: ParsedRobots, agent: string, path: string): RobotsVerdict {
  const token = agent.toLowerCase();
  let groups = parsed.groups.filter((g) => g.agents.includes(token));
  let matchedAgent: string | null = groups.length > 0 ? token : null;
  if (groups.length === 0) {
    groups = parsed.groups.filter((g) => g.agents.includes("*"));
    matchedAgent = groups.length > 0 ? "*" : null;
  }
  const candidates = groups
    .flatMap((g) => g.rules)
    .filter((r) => toRegExp(r.path).test(path))
    .sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  const rule = candidates[0] ?? null;
  return { allowed: rule ? rule.allow : true, groups, matchedAgent, rule, candidates };
}

export const CRAWLERS = [
  { value: "Googlebot", label: "Googlebot" },
  { value: "Bingbot", label: "Bingbot" },
  { value: "GPTBot", label: "GPTBot (OpenAI)" },
  { value: "SomeOtherBot", label: "Any other crawler" },
] as const;

export const SAMPLE_ROBOTS = `# This site's file, plus rules to try
User-agent: *
Allow: /
Disallow: /seo/
Allow: /seo/how-search-works

User-agent: Googlebot
Disallow: /*.json$
Crawl-delay: 10

Sitemap: https://learn.huyle.work/sitemap.xml
`;

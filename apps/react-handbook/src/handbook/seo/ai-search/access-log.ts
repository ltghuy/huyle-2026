import { AI_BOTS, type BotJob } from "@/lib/ai-bots";

// Reading AI bot traffic from an access log in the common "combined" format.
// A user agent is only a claim; vendors publish the addresses their bots use,
// so a request is checked against them. The ranges here are SAMPLES from the
// documentation networks of RFC 5737, not any vendor's real list.

export type LogLine = { line: number; ip: string; path: string; status: number; agent: string };

export type ParsedLog = { lines: LogLine[]; unparsed: { line: number; text: string }[] };

const COMBINED = /^(\S+) \S+ \S+ \[[^\]]+\] "(?:GET|HEAD|POST) (\S+)[^"]*" (\d{3}) \S+ "[^"]*" "([^"]*)"$/;

export function parseLog(text: string): ParsedLog {
  const lines: LogLine[] = [];
  const unparsed: ParsedLog["unparsed"] = [];
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const t = raw.trim();
    if (t === "") continue;
    const m = t.match(COMBINED);
    if (m) lines.push({ line: i + 1, ip: m[1], path: m[2], status: Number(m[3]), agent: m[4] });
    else unparsed.push({ line: i + 1, text: t });
  }
  return { lines, unparsed };
}

type KnownBot = { token: string; vendor: string; job: BotJob; mayIgnoreRobots?: boolean; searchEngine?: boolean };

// Longest first, so a token that contains another wins.
const KNOWN: readonly KnownBot[] = [...AI_BOTS, { token: "Googlebot", vendor: "Google", job: "search" as const, searchEngine: true }, { token: "Bingbot", vendor: "Microsoft", job: "search" as const, searchEngine: true }].sort(
  (a, b) => b.token.length - a.token.length,
);

export function identify(agent: string): KnownBot | null {
  const ua = agent.toLowerCase();
  return KNOWN.find((b) => ua.includes(b.token.toLowerCase())) ?? null;
}

export const SAMPLE_RANGES: Record<string, string> = {
  OpenAI: "192.0.2.0/25",
  Anthropic: "192.0.2.128/25",
  Perplexity: "198.51.100.0/25",
  Google: "198.51.100.128/25",
  "Common Crawl": "203.0.113.0/26",
  Meta: "203.0.113.64/26",
};

function toNumber(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return parts.reduce((n, p) => n * 256 + p, 0);
}

export function inRange(ip: string, cidr: string) {
  const [base, bits] = cidr.split("/");
  const a = toNumber(ip);
  const b = toNumber(base);
  if (a === null || b === null) return false;
  const size = 2 ** (32 - Number(bits));
  return Math.floor(a / size) === Math.floor(b / size);
}

export const SAMPLE_LOG = `192.0.2.10 - - [22/Oct/2026:08:01:12 +0000] "GET /robots.txt HTTP/1.1" 200 812 "-" "Mozilla/5.0 (compatible; GPTBot/1.3)"
192.0.2.11 - - [22/Oct/2026:08:01:40 +0000] "GET /seo/ai-search HTTP/1.1" 200 48211 "-" "Mozilla/5.0 (compatible; OAI-SearchBot/1.3)"
192.0.2.40 - - [22/Oct/2026:08:02:03 +0000] "GET /seo/javascript-seo HTTP/1.1" 200 51002 "-" "Mozilla/5.0 (compatible; ChatGPT-User/1.0)"
203.0.113.200 - - [22/Oct/2026:08:02:30 +0000] "GET /react-practices HTTP/1.1" 200 39120 "-" "Mozilla/5.0 (compatible; GPTBot/1.3)"
192.0.2.130 - - [22/Oct/2026:08:03:11 +0000] "GET /robots.txt HTTP/1.1" 200 812 "-" "Mozilla/5.0 (compatible; ClaudeBot/1.0)"
192.0.2.131 - - [22/Oct/2026:08:03:15 +0000] "GET /seo/how-search-works HTTP/1.1" 200 47730 "-" "Mozilla/5.0 (compatible; Claude-SearchBot/1.0)"
198.51.100.7 - - [22/Oct/2026:08:04:00 +0000] "GET /seo HTTP/1.1" 200 22018 "-" "Mozilla/5.0 (compatible; PerplexityBot/1.0)"
198.51.100.9 - - [22/Oct/2026:08:04:22 +0000] "GET /seo/metadata-structured-data HTTP/1.1" 200 50311 "-" "Mozilla/5.0 (compatible; Perplexity-User/1.0)"
198.51.100.140 - - [22/Oct/2026:08:05:01 +0000] "GET / HTTP/1.1" 200 30552 "-" "Mozilla/5.0 (compatible; Googlebot/2.1)"
203.0.113.5 - - [22/Oct/2026:08:05:44 +0000] "GET /seo/crawling-indexing HTTP/1.1" 200 46005 "-" "CCBot/2.0"
203.0.113.70 - - [22/Oct/2026:08:06:10 +0000] "GET /seo/ai-search HTTP/1.1" 200 48211 "-" "meta-externalfetcher/1.1"
192.0.2.250 - - [22/Oct/2026:08:06:30 +0000] "GET / HTTP/1.1" 200 30552 "https://www.google.com/" "Mozilla/5.0 (Macintosh) Safari/605.1.15"
this line was cut off by log rotation
`;

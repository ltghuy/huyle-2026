// What each vendor's documented controls do to a site's place in normal
// search, in AI answers and in model training. Sources are in
// .artifacts/research/ai-search.md; the outcomes are a summary of those
// pages, not of how each system behaves inside.

export type Controls = {
  googlebot: boolean;
  googleExtended: boolean;
  /** Search Console's generative AI setting: include or exclude. */
  googleAi: boolean;
  noindex: boolean;
  nosnippet: boolean;
  bingNoarchive: boolean;
  bingNocache: boolean;
  gptbot: boolean;
  oaiSearch: boolean;
  claudebot: boolean;
  claudeSearch: boolean;
  perplexityBot: boolean;
};

export type ControlKey = keyof Controls;

/** Each control as the learner sees it, grouped by vendor. `on` is the allowing state. */
export const CONTROL_GROUPS: { vendor: string; controls: { key: ControlKey; label: string; on: string; off: string }[] }[] = [
  {
    vendor: "Google",
    controls: [
      { key: "googlebot", label: "Googlebot", on: "allowed", off: "disallowed in robots.txt" },
      { key: "googleExtended", label: "Google-Extended", on: "allowed", off: "disallowed in robots.txt" },
      { key: "googleAi", label: "Search generative AI setting", on: "include (default)", off: "exclude" },
    ],
  },
  {
    vendor: "Every search engine",
    controls: [
      { key: "noindex", label: "Index the page", on: "yes", off: "noindex" },
      { key: "nosnippet", label: "Show a snippet", on: "yes", off: "nosnippet" },
    ],
  },
  {
    vendor: "Bing",
    controls: [
      { key: "bingNoarchive", label: "Copilot may use the content", on: "yes", off: "noarchive" },
      { key: "bingNocache", label: "Copilot may use more than the snippet", on: "yes", off: "nocache" },
    ],
  },
  {
    vendor: "OpenAI",
    controls: [
      { key: "gptbot", label: "GPTBot", on: "allowed", off: "disallowed" },
      { key: "oaiSearch", label: "OAI-SearchBot", on: "allowed", off: "disallowed" },
    ],
  },
  {
    vendor: "Anthropic",
    controls: [
      { key: "claudebot", label: "ClaudeBot", on: "allowed", off: "disallowed" },
      { key: "claudeSearch", label: "Claude-SearchBot", on: "allowed", off: "disallowed" },
    ],
  },
  {
    vendor: "Perplexity",
    controls: [{ key: "perplexityBot", label: "PerplexityBot", on: "allowed", off: "disallowed" }],
  },
];

const ALL_ON: Controls = {
  googlebot: true,
  googleExtended: true,
  googleAi: true,
  noindex: true,
  nosnippet: true,
  bingNoarchive: true,
  bingNocache: true,
  gptbot: true,
  oaiSearch: true,
  claudebot: true,
  claudeSearch: true,
  perplexityBot: true,
};

const NO_TRAINING = { googleExtended: false, gptbot: false, claudebot: false };

export const GOALS = {
  everywhere: { label: "Everywhere, including training", controls: ALL_ON },
  noTraining: { label: "In search and AI answers, out of training", controls: { ...ALL_ON, ...NO_TRAINING } },
  searchOnly: {
    label: "In normal search only",
    controls: { ...ALL_ON, ...NO_TRAINING, googleAi: false, bingNoarchive: false, oaiSearch: false, claudeSearch: false, perplexityBot: false },
  },
  nowhere: {
    label: "Out of search and AI entirely",
    // Googlebot stays allowed: it has to fetch the page to see noindex.
    controls: { ...ALL_ON, ...NO_TRAINING, noindex: false, oaiSearch: false, claudeSearch: false, perplexityBot: false },
  },
} as const satisfies Record<string, { label: string; controls: Controls }>;

export type GoalId = keyof typeof GOALS;

export type Outcome = { value: "yes" | "no" | "limited" | "n/a" | "unknown"; why: string };

export type VendorOutcome = { vendor: string; search: Outcome; ai: Outcome; training: Outcome };

const yes = (why: string): Outcome => ({ value: "yes", why });
const no = (why: string): Outcome => ({ value: "no", why });
const limited = (why: string): Outcome => ({ value: "limited", why });

export function outcomes(c: Controls): VendorOutcome[] {
  const googleSearch = !c.noindex
    ? no("noindex")
    : !c.googlebot
      ? no("Googlebot can't fetch the page")
      : !c.nosnippet
        ? limited("listed without a snippet")
        : yes("indexed with a snippet");
  const googleAi = !c.noindex || !c.googlebot
    ? no("not in the index")
    : !c.googleAi
      ? no("excluded in Search Console")
      : !c.nosnippet
        ? no("AI features need a page eligible for a snippet")
        : yes("same index, no extra requirements");
  const bingSearch = !c.noindex ? no("noindex") : !c.nosnippet ? limited("listed without a caption") : yes("indexed");
  const bingAi = !c.noindex
    ? no("noindex keeps it out of Copilot")
    : !c.bingNoarchive
      ? no("noarchive keeps it out of Copilot answers")
      : !c.bingNocache
        ? limited("Copilot uses only the URL, title and snippet")
        : !c.nosnippet
          ? limited("nosnippet may limit citations")
          : yes("same index as Bing search");

  return [
    {
      vendor: "Google",
      search: googleSearch,
      ai: googleAi,
      training: c.googleExtended ? yes("Gemini training allowed") : no("Google-Extended disallowed"),
    },
    {
      vendor: "Bing",
      search: bingSearch,
      ai: bingAi,
      training: { value: "unknown", why: c.bingNoarchive ? "the current guidelines don't say" : "a 2023 post said noarchive also stops training; not repeated since" },
    },
    {
      vendor: "OpenAI",
      search: { value: "n/a", why: "no classic search results" },
      ai: c.oaiSearch ? yes("OAI-SearchBot allowed") : no("OAI-SearchBot disallowed; may still show as a plain link"),
      training: c.gptbot ? yes("GPTBot allowed") : no("GPTBot disallowed"),
    },
    {
      vendor: "Anthropic",
      search: { value: "n/a", why: "no classic search results" },
      ai: c.claudeSearch ? yes("Claude-SearchBot allowed") : no("Claude-SearchBot disallowed"),
      training: c.claudebot ? yes("ClaudeBot allowed") : no("ClaudeBot disallowed"),
    },
    {
      vendor: "Perplexity",
      search: { value: "n/a", why: "no classic search results" },
      ai: c.perplexityBot ? yes("PerplexityBot allowed") : no("PerplexityBot disallowed"),
      training: { value: "n/a", why: "Perplexity says its crawler doesn't collect training data" },
    },
  ];
}

const ROBOTS_TOKENS: [ControlKey, string][] = [
  ["googlebot", "Googlebot"],
  ["googleExtended", "Google-Extended"],
  ["gptbot", "GPTBot"],
  ["oaiSearch", "OAI-SearchBot"],
  ["claudebot", "ClaudeBot"],
  ["claudeSearch", "Claude-SearchBot"],
  ["perplexityBot", "PerplexityBot"],
];

/** The robots.txt groups, meta tags and settings that produce these controls. */
export function settings(c: Controls) {
  const blocked = ROBOTS_TOKENS.filter(([key]) => !c[key]).map(([, token]) => token);
  const robots = blocked.length > 0 ? `${blocked.map((t) => `User-agent: ${t}`).join("\n")}\nDisallow: /\n\nUser-agent: *\nAllow: /` : "User-agent: *\nAllow: /";
  const robotsMeta = [!c.noindex && "noindex", !c.nosnippet && "nosnippet"].filter(Boolean);
  const bingMeta = [!c.bingNoarchive && "noarchive", !c.bingNocache && "nocache"].filter(Boolean);
  const meta = [
    robotsMeta.length > 0 ? `<meta name="robots" content="${robotsMeta.join(", ")}">` : null,
    bingMeta.length > 0 ? `<meta name="bingbot" content="${bingMeta.join(", ")}">` : null,
  ].filter((line): line is string => line !== null);
  const console = c.googleAi ? null : "Search Console › Settings › Search generative AI: Exclude";
  return { robots, meta, console };
}

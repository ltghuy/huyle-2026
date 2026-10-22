// The AI crawlers and control tokens their vendors document, checked
// 2026-10-22 (sources in .artifacts/research/ai-search.md). robots.ts builds
// this site's rules from it, and the SEO demos list it.

/**
 * What a token is for: collecting training data, building the index an AI
 * answer cites from, fetching a page because a user asked, or only
 * controlling how pages another crawler fetched may be used.
 */
export type BotJob = "training" | "search" | "user" | "control";

export type AiBot = {
  token: string;
  vendor: string;
  job: BotJob;
  /** The vendor says the bot may not follow robots.txt. */
  mayIgnoreRobots?: boolean;
  source: string;
};

const OPENAI = "https://developers.openai.com/api/docs/bots";
const ANTHROPIC = "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler";
const PERPLEXITY = "https://docs.perplexity.ai/guides/bots";
const META = "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers";
const AMAZON = "https://developer.amazon.com/amazonbot";
const MISTRAL = "https://docs.mistral.ai/robots";

export const AI_BOTS: readonly AiBot[] = [
  { token: "GPTBot", vendor: "OpenAI", job: "training", source: OPENAI },
  { token: "OAI-SearchBot", vendor: "OpenAI", job: "search", source: OPENAI },
  { token: "ChatGPT-User", vendor: "OpenAI", job: "user", mayIgnoreRobots: true, source: OPENAI },
  { token: "ClaudeBot", vendor: "Anthropic", job: "training", source: ANTHROPIC },
  { token: "Claude-SearchBot", vendor: "Anthropic", job: "search", source: ANTHROPIC },
  { token: "Claude-User", vendor: "Anthropic", job: "user", source: ANTHROPIC },
  { token: "Google-Extended", vendor: "Google", job: "control", source: "https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers" },
  { token: "Applebot-Extended", vendor: "Apple", job: "control", source: "https://support.apple.com/en-us/119829" },
  { token: "PerplexityBot", vendor: "Perplexity", job: "search", source: PERPLEXITY },
  { token: "Perplexity-User", vendor: "Perplexity", job: "user", mayIgnoreRobots: true, source: PERPLEXITY },
  { token: "CCBot", vendor: "Common Crawl", job: "training", source: "https://commoncrawl.org/ccbot" },
  { token: "meta-externalagent", vendor: "Meta", job: "training", source: META },
  { token: "Meta-WebIndexer", vendor: "Meta", job: "search", source: META },
  { token: "Meta-ExternalFetcher", vendor: "Meta", job: "user", mayIgnoreRobots: true, source: META },
  { token: "Amazonbot", vendor: "Amazon", job: "training", source: AMAZON },
  { token: "Amzn-SearchBot", vendor: "Amazon", job: "search", source: AMAZON },
  { token: "Amzn-User", vendor: "Amazon", job: "user", mayIgnoreRobots: true, source: AMAZON },
  { token: "DuckAssistBot", vendor: "DuckDuckGo", job: "search", source: "https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot" },
  { token: "MistralAI-Training", vendor: "Mistral", job: "training", source: MISTRAL },
  { token: "MistralAI-Index", vendor: "Mistral", job: "search", source: MISTRAL },
  { token: "MistralAI-User", vendor: "Mistral", job: "user", source: MISTRAL },
];

export const JOB_LABEL: Record<BotJob, string> = {
  training: "Training",
  search: "AI search",
  user: "User request",
  control: "Training control",
};

export const tokensFor = (...jobs: BotJob[]) => AI_BOTS.filter((b) => jobs.includes(b.job)).map((b) => b.token);

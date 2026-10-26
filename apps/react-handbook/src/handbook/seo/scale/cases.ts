// Cases of pages made at scale, sorted by Google's spam policies (checked
// 2026-10-22). The reasons paraphrase the policies; short quotes are marked.

export type Category = "fine" | "scaled" | "doorway" | "reputation";

export const CATEGORY_LABEL: Record<Category, string> = {
  fine: "Fine",
  scaled: "Scaled content abuse",
  doorway: "Doorway abuse",
  reputation: "Site reputation abuse",
};

export type Case = { id: string; text: string; answer: Category; reason: string; source: { label: string; href: string } };

const SPAM = { label: "Google: spam policies", href: "https://developers.google.com/search/docs/essentials/spam-policies" };
const AI = { label: "Google: AI-generated content", href: "https://developers.google.com/search/blog/2023/02/google-search-and-ai-content" };
const HELPFUL = { label: "Google: helpful content", href: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" };

export const CASES: readonly Case[] = [
  {
    id: "cities",
    text: "A plumber's site has 900 pages, one per town, each the same text with the town's name swapped in.",
    answer: "doorway",
    reason: "Pages made to rank for many similar searches that lead to the same thing are doorways. Nothing on them is specific to the town.",
    source: SPAM,
  },
  {
    id: "catalogue",
    text: "A shop generates one page per product from its catalogue, with specs, stock, prices and reviews from buyers.",
    answer: "fine",
    reason: "Every page is generated, but each describes a real product with its own data. Google objects to pages made mainly to rank, whatever the scale.",
    source: HELPFUL,
  },
  {
    id: "ai-glossary",
    text: "A team uses an LLM to write 5,000 glossary pages for keywords from a research tool, publishing them unreviewed.",
    answer: "scaled",
    reason: "Generating many pages without adding value is the policy's own example of scaled content abuse, \"no matter how it's created.\"",
    source: SPAM,
  },
  {
    id: "ai-reviewed",
    text: "An editor drafts release notes with an AI tool, checks every claim against the changelog and publishes one page per release.",
    answer: "fine",
    reason: "Google says appropriate use of AI or automation isn't against its guidelines. The purpose here is to help readers, and a person checks the facts.",
    source: AI,
  },
  {
    id: "coupons",
    text: "A news site hosts a coupon section written by a third party it doesn't edit, placed there to rank on the news site's name.",
    answer: "reputation",
    reason: "Third-party content published mainly because of the host's ranking signals, without the host's oversight, is site reputation abuse.",
    source: SPAM,
  },
  {
    id: "scraped",
    text: "A site republishes other blogs' posts, run through a synonym tool so they don't look copied.",
    answer: "scaled",
    reason: "Scraping and lightly rewriting other sites' content is listed under scaled content abuse.",
    source: SPAM,
  },
  {
    id: "docs",
    text: "A library generates an API reference page for every function from its source comments, with examples.",
    answer: "fine",
    reason: "Reference pages generated from real source code answer real questions; that's people-first content made by automation.",
    source: HELPFUL,
  },
  {
    id: "partner",
    text: "A recipe site publishes a partner's sponsored guides after its own editors review and rewrite them, clearly labelled.",
    answer: "fine",
    reason: "The policy separates abuse from third-party content the host oversees and integrates. Editorial review and a clear label are what Google looks for.",
    source: SPAM,
  },
];

// Robots rules (meta tag or X-Robots-Tag header) as Google documents them,
// written out in each syntax with what a search engine does with the page.

export type ImagePreview = "default" | "none" | "standard" | "large";

export type RuleSet = {
  noindex: boolean;
  nofollow: boolean;
  nosnippet: boolean;
  maxSnippet: string;
  maxImagePreview: ImagePreview;
  noimageindex: boolean;
  unavailableAfter: string;
  indexifembedded: boolean;
  noarchive: boolean;
};

export const EMPTY_RULES: RuleSet = {
  noindex: false,
  nofollow: false,
  nosnippet: false,
  maxSnippet: "",
  maxImagePreview: "default",
  noimageindex: false,
  unavailableAfter: "",
  indexifembedded: false,
  noarchive: false,
};

function snippetLength(rules: RuleSet) {
  const n = Number.parseInt(rules.maxSnippet, 10);
  return rules.maxSnippet.trim() === "" || Number.isNaN(n) ? null : n;
}

/** The rules in the order Google lists them, as tokens for a meta tag or header. */
export function ruleTokens(rules: RuleSet): string[] {
  const tokens: string[] = [];
  if (rules.noindex && rules.nofollow) tokens.push("none");
  else {
    if (rules.noindex) tokens.push("noindex");
    if (rules.nofollow) tokens.push("nofollow");
  }
  if (rules.nosnippet) tokens.push("nosnippet");
  if (rules.indexifembedded) tokens.push("indexifembedded");
  const n = snippetLength(rules);
  if (n !== null) tokens.push(`max-snippet:${n}`);
  if (rules.maxImagePreview !== "default") tokens.push(`max-image-preview:${rules.maxImagePreview}`);
  if (rules.noimageindex) tokens.push("noimageindex");
  if (rules.unavailableAfter) tokens.push(`unavailable_after: ${rules.unavailableAfter}`);
  if (rules.noarchive) tokens.push("noarchive");
  return tokens;
}

/** The Next.js `metadata.robots` object for the rules. */
export function nextMetadata(rules: RuleSet): string {
  const fields: string[] = [];
  if (rules.noindex) fields.push("index: false");
  if (rules.nofollow) fields.push("follow: false");
  if (rules.nosnippet) fields.push("nosnippet: true");
  if (rules.indexifembedded) fields.push("indexifembedded: true");
  const n = snippetLength(rules);
  if (n !== null) fields.push(`"max-snippet": ${n}`);
  if (rules.maxImagePreview !== "default") fields.push(`"max-image-preview": "${rules.maxImagePreview}"`);
  if (rules.noimageindex) fields.push("noimageindex: true");
  if (rules.unavailableAfter) fields.push(`unavailable_after: "${rules.unavailableAfter}"`);
  if (rules.noarchive) fields.push("noarchive: true");
  if (fields.length === 0) return "// No robots field: the defaults (index, follow) apply.";
  return `export const metadata: Metadata = {\n  robots: {\n${fields.map((f) => `    ${f},`).join("\n")}\n  },\n};`;
}

export type Effect = { label: string; value: string; ok: boolean };

export function effects(rules: RuleSet): Effect[] {
  const n = snippetLength(rules);
  const snippet = rules.noindex
    ? "None: the page isn't shown."
    : rules.nosnippet || n === 0
      ? "No text snippet."
      : n !== null && n > 0
        ? `Up to ${n} characters.`
        : "Google picks the length.";
  return [
    { label: "In search results", value: rules.noindex ? (rules.indexifembedded ? "No, except when embedded in another page with an iframe." : "No.") : "Yes, if Google indexes it.", ok: !rules.noindex },
    { label: "Links on the page followed", value: rules.nofollow ? "No." : "Yes.", ok: !rules.nofollow },
    { label: "Text snippet", value: snippet, ok: !rules.noindex && !rules.nosnippet && n !== 0 },
    {
      label: "Image preview",
      value: rules.maxImagePreview === "default" ? "Google picks the size." : rules.maxImagePreview === "none" ? "None." : `At most ${rules.maxImagePreview}.`,
      ok: rules.maxImagePreview !== "none",
    },
    { label: "Images indexed", value: rules.noimageindex ? "No." : "Yes.", ok: !rules.noimageindex },
    ...(rules.unavailableAfter ? [{ label: "Dropped from results", value: `After ${rules.unavailableAfter}.`, ok: false }] : []),
  ];
}

export function warnings(rules: RuleSet): string[] {
  const out: string[] = [];
  if (rules.noarchive) out.push("noarchive has no effect: Google Search no longer uses it.");
  if (rules.indexifembedded && !rules.noindex) out.push("indexifembedded only works together with noindex.");
  if (rules.nosnippet && snippetLength(rules) !== null) out.push("nosnippet and max-snippet conflict; the more restrictive rule, nosnippet, wins.");
  if (rules.noindex && (rules.nosnippet || snippetLength(rules) !== null || rules.maxImagePreview !== "default")) {
    out.push("With noindex the page isn't shown at all, so the snippet and preview rules don't matter.");
  }
  if (rules.noindex) out.push("Don't also block this URL in robots.txt, or crawlers never read the noindex.");
  return out;
}

// A simplified model of canonical selection. Google weighs signals rather
// than obeying one; the points below only mirror its "strong" and "weak"
// wording and are listed on the page as assumptions.

export type VariantId = "preferred" | "http" | "slash" | "upper" | "utm";

export const ORIGIN = "learn.huyle.work";

export const VARIANTS: readonly { id: VariantId; url: string; cause: string }[] = [
  { id: "preferred", url: `https://${ORIGIN}/seo/how-search-works`, cause: "The URL you want shown." },
  { id: "http", url: `http://${ORIGIN}/seo/how-search-works`, cause: "The site also answers over HTTP." },
  { id: "slash", url: `https://${ORIGIN}/seo/how-search-works/`, cause: "A trailing slash serves the same page." },
  { id: "upper", url: `https://${ORIGIN}/seo/How-Search-Works`, cause: "Paths that ignore letter case." },
  { id: "utm", url: `https://${ORIGIN}/seo/how-search-works?utm_source=newsletter`, cause: "A tracking parameter from a shared link." },
];

export type SignalId = "redirect" | "canonical" | "links" | "sitemap";

export const SIGNALS: readonly { id: SignalId; label: string; short: string; points: number; strength: string }[] = [
  { id: "redirect", label: "Other URLs redirect (301) to", short: "a redirect", points: 4, strength: "strong" },
  { id: "canonical", label: 'rel="canonical" on every URL points to', short: 'rel="canonical"', points: 3, strength: "strong" },
  { id: "links", label: "Internal links point to", short: "internal links", points: 2, strength: "hint" },
  { id: "sitemap", label: "The sitemap lists", short: "the sitemap", points: 1, strength: "weak" },
];

export const HTTPS_POINTS = 1;

export type CanonicalState = { variants: ReadonlySet<VariantId>; targets: Record<SignalId, VariantId | "none"> };

export type CanonicalResult = {
  scores: { id: VariantId; points: number }[];
  chosen: VariantId;
  agree: boolean;
  /** No signal was set, so the choice is the search engine's own. */
  unguided: boolean;
  /** A canonical was declared and the model picked something else. */
  overruled: boolean;
};

export function chooseCanonical({ variants, targets }: CanonicalState): CanonicalResult {
  const live = VARIANTS.filter((v) => v.id === "preferred" || variants.has(v.id));
  const scores = live.map((v) => {
    let points = v.url.startsWith("https:") ? HTTPS_POINTS : 0;
    for (const s of SIGNALS) if (targets[s.id] === v.id) points += s.points;
    return { id: v.id, points };
  });
  const chosen = scores.reduce((best, s) => (s.points > best.points ? s : best)).id;
  const set = SIGNALS.map((s) => targets[s.id]).filter((t): t is VariantId => t !== "none" && live.some((v) => v.id === t));
  return {
    scores,
    chosen,
    agree: set.every((t) => t === chosen),
    unguided: set.length === 0,
    overruled: targets.canonical !== "none" && targets.canonical !== chosen,
  };
}

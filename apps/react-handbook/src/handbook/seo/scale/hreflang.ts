// Checks an hreflang cluster against Google's documented rules: every
// version lists itself and every other version, links go both ways, codes
// are an ISO 639-1 language with an optional ISO 15924 script and ISO 3166-1
// region, and URLs are absolute.
//
// Input format, one page per unindented line and its alternates indented:
//   https://example.com/en/ en
//     en https://example.com/en/
//     de https://example.com/de/

export type Alternate = { code: string; href: string; line: number };

export type ClusterPage = { url: string; code: string; line: number; alternates: Alternate[] };

export type Finding = { line: number; text: string };

// ISO 639-1 two-letter language codes.
const LANGUAGES = new Set(
  "aa ab ae af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu".split(" "),
);

// Region codes Google says it ignores, with the one it expects instead.
const IGNORED_REGIONS: Record<string, string> = { uk: "GB", eu: "a country code", un: "a country code" };

/** Why a code is invalid, or null when it's valid. */
export function codeProblem(code: string): string | null {
  if (code.toLowerCase() === "x-default") return null;
  const parts = code.split("-");
  const [language, ...rest] = parts;
  if (!LANGUAGES.has(language.toLowerCase())) {
    return parts.length === 1 && /^[a-z]{2}$/i.test(language)
      ? `"${code}" isn't an ISO 639-1 language. A country code can't be used on its own.`
      : `"${code}" doesn't start with an ISO 639-1 language code.`;
  }
  // An optional script such as Hant comes before the region.
  if (rest.length > 0 && /^[a-z]{4}$/i.test(rest[0])) rest.shift();
  const region = rest.shift();
  if (rest.length > 0) return `"${code}" has too many parts.`;
  if (region !== undefined) {
    if (!/^[a-z]{2}$/i.test(region)) return `"${code}": the region must be a two-letter ISO 3166-1 code.`;
    const instead = IGNORED_REGIONS[region.toLowerCase()];
    if (instead) return `"${code}": Google ignores the region "${region}"; use ${instead}.`;
  }
  return null;
}

export function parseCluster(text: string): { pages: ClusterPage[]; findings: Finding[] } {
  const pages: ClusterPage[] = [];
  const findings: Finding[] = [];
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const line = i + 1;
    if (raw.trim() === "" || raw.trim().startsWith("#")) continue;
    const parts = raw.trim().split(/\s+/);
    if (!/^\s/.test(raw)) {
      if (parts.length !== 2) findings.push({ line, text: "A page line is a URL and its language code." });
      else pages.push({ url: parts[0], code: parts[1], line, alternates: [] });
      continue;
    }
    const page = pages.at(-1);
    if (!page) findings.push({ line, text: "An alternate before any page line belongs to no page." });
    else if (parts.length !== 2) findings.push({ line, text: "An alternate line is a code and a URL." });
    else page.alternates.push({ code: parts[0], href: parts[1], line });
  }
  return { pages, findings };
}

export type PageReport = { page: ClusterPage; problems: string[] };

export function checkCluster(pages: ClusterPage[]) {
  const cluster: string[] = [];
  if (pages.length < 2) cluster.push("A cluster needs at least two versions of the page.");
  if (pages.length >= 2 && !pages.some((p) => p.alternates.some((a) => a.code.toLowerCase() === "x-default"))) {
    cluster.push("No x-default. It's optional, and tells Google which page to show when no version matches the searcher.");
  }

  const reports: PageReport[] = pages.map((page) => {
    const problems: string[] = [];
    const codeIssue = codeProblem(page.code);
    if (codeIssue) problems.push(codeIssue);
    for (const a of page.alternates) {
      const issue = codeProblem(a.code);
      if (issue) problems.push(`Line ${a.line}: ${issue}`);
      if (!/^https?:\/\//.test(a.href)) problems.push(`Line ${a.line}: ${a.href} isn't a full URL with the protocol.`);
    }
    if (!page.alternates.some((a) => a.href === page.url)) problems.push("Doesn't list itself. Each version must list itself as well as the others.");
    for (const other of pages) {
      if (other === page) continue;
      const lists = page.alternates.some((a) => a.href === other.url);
      const listedBack = other.alternates.some((a) => a.href === page.url);
      if (!lists) problems.push(`Doesn't list ${other.url}.`);
      else if (!listedBack) problems.push(`Lists ${other.url}, which doesn't link back, so Google ignores that pair.`);
    }
    return { page, problems };
  });

  return { cluster, reports };
}

/** Does `from` list `to` as an alternate? */
export function links(from: ClusterPage, to: ClusterPage) {
  return from.alternates.some((a) => a.href === to.url);
}

export const SAMPLES = {
  valid: `https://example.com/en/ en
  en https://example.com/en/
  de https://example.com/de/
  fr-CA https://example.com/fr-ca/
  x-default https://example.com/en/
https://example.com/de/ de
  en https://example.com/en/
  de https://example.com/de/
  fr-CA https://example.com/fr-ca/
  x-default https://example.com/en/
https://example.com/fr-ca/ fr-CA
  en https://example.com/en/
  de https://example.com/de/
  fr-CA https://example.com/fr-ca/
  x-default https://example.com/en/
`,
  oneWay: `# The German page was added later and never got the links.
https://example.com/en/ en
  en https://example.com/en/
  de https://example.com/de/
https://example.com/de/ de
  de https://example.com/de/
`,
  noSelf: `# Like a framework's localized sitemap example: no entry for the page itself.
https://example.com/ en
  es https://example.com/es
  de https://example.com/de
https://example.com/es es
  en https://example.com/
  de https://example.com/de
https://example.com/de de
  en https://example.com/
  es https://example.com/es
`,
  badCodes: `https://example.co.uk/ en-UK
  en-UK https://example.co.uk/
  jp /ja/
https://example.com/ja/ jp
  en-UK https://example.co.uk/
  jp https://example.com/ja/
`,
} as const;

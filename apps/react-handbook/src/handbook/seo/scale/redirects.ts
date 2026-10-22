// Checks a migration's redirect map: every old URL should reach a page on
// the new site in one permanent redirect, or answer 404 or 410 on purpose.

export type Rule = { from: string; to: string | null; code: number; line: number };

export type Resolution = {
  url: string;
  hops: Rule[];
  final: string | null;
  /** 404 or 410 when the map retires the URL. */
  gone: number | null;
  loop: boolean;
  findings: { ok: boolean; text: string }[];
};

const PERMANENT = new Set([301, 308]);

export function parseMap(text: string) {
  const rules = new Map<string, Rule>();
  const errors: { line: number; text: string }[] = [];
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const line = i + 1;
    const t = raw.trim();
    if (t === "" || t.startsWith("#")) continue;
    const [from, second, third, ...extra] = t.split(/\s+/);
    if (extra.length > 0 || !from.startsWith("/") || second === undefined) {
      errors.push({ line, text: "Use: /old /new [301|302|307|308], or /old 410" });
      continue;
    }
    if (/^(404|410)$/.test(second)) rules.set(from, { from, to: null, code: Number(second), line });
    else if (second.startsWith("/") && (third === undefined || /^(301|302|307|308)$/.test(third))) rules.set(from, { from, to: second, code: third ? Number(third) : 301, line });
    else errors.push({ line, text: "Use: /old /new [301|302|307|308], or /old 410" });
  }
  return { rules, errors };
}

export const listOf = (text: string) => text.split(/\s+/).filter((u) => u.startsWith("/"));

export function resolve(url: string, rules: Map<string, Rule>, newSite: Set<string>): Resolution {
  const hops: Rule[] = [];
  const seen = new Set([url]);
  let current = url;
  let loop = false;
  let gone: number | null = null;
  for (let rule = rules.get(current); rule; rule = rules.get(current)) {
    hops.push(rule);
    if (rule.to === null) {
      gone = rule.code;
      break;
    }
    if (seen.has(rule.to)) {
      loop = true;
      break;
    }
    seen.add(rule.to);
    current = rule.to;
  }
  const final = gone === null && !loop ? current : null;
  const findings: Resolution["findings"] = [];

  if (hops.length === 0) {
    findings.push(newSite.has(url) ? { ok: true, text: "Kept at the same URL" } : { ok: false, text: "No redirect and no page at this URL: it will 404 by accident" });
    return { url, hops, final, gone, loop, findings };
  }
  if (loop) findings.push({ ok: false, text: "Redirect loop: crawlers and browsers give up" });
  if (gone !== null) findings.push({ ok: true, text: `Retired with ${gone}, on purpose` });
  if (hops.length > 1 && !loop) findings.push({ ok: false, text: `Chain of ${hops.length} hops: redirect straight to ${final ?? "the last target"}` });
  const temporary = hops.filter((h) => h.to !== null && !PERMANENT.has(h.code));
  if (temporary.length > 0) findings.push({ ok: false, text: `Temporary ${temporary.map((h) => h.code).join(", ")}: a move needs 301 or 308` });
  if (final !== null) {
    findings.push(newSite.has(final) ? { ok: true, text: `Ends on ${final}, which exists` } : { ok: false, text: `Ends on ${final}, which isn't on the new site` });
  }
  return { url, hops, final, gone, loop, findings };
}

export const SAMPLE = {
  old: `/shop
/shop/shoes
/shop/shoes/runner-2
/shop/bags
/blog/2019/summer-sale
/about-us
/careers
/press`,
  map: `/shop /store 301
/shop/shoes /store/shoes 301
/shop/shoes/runner-2 /shop/shoes/runner-3 301
/shop/shoes/runner-3 /store/shoes/runner-3 301
/shop/bags /store/bags 302
/blog/2019/summer-sale 410
/about-us /company 301
/company /about-us 301`,
  newSite: `/store
/store/shoes
/store/shoes/runner-3
/store/bags
/company
/careers`,
} as const;

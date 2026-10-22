// A simplified crawl of this site, built from the handbook's own page list.
// It starts at the home page and follows links breadth first; only real
// <a href> links without nofollow are followed. A sitemap adds every page the
// links didn't reach.

import { NAV_FOLDERS } from "@/components/playground/nav-folders";

export type LinkStyle = "link" | "onclick" | "afterClick" | "nofollow";

export type LinkGroup = "home" | "section" | "sidebar";

export const LINK_STYLES: readonly { value: LinkStyle; label: string; detail: string }[] = [
  { value: "link", label: "<a href>", detail: "A real link: followed." },
  { value: "onclick", label: "onClick only", detail: "A button or div that calls router.push(): no URL to follow." },
  { value: "afterClick", label: "After a click", detail: "Links appear only when a menu is opened: not in what the crawler reads." },
  { value: "nofollow", label: "nofollow", detail: "A real link marked rel=\"nofollow\": a hint not to follow, treated here as not followed." },
];

export const LINK_GROUPS: readonly { id: LinkGroup; label: string; detail: string }[] = [
  { id: "home", label: "Home page section cards", detail: "Home links to each section page." },
  { id: "section", label: "Section page cards", detail: "Each section page links to its pages." },
  { id: "sidebar", label: "Sidebar", detail: "On every page, links to every section and page." },
];

export type CrawlNode = { href: string; title: string };

const SECTIONS: readonly (CrawlNode & { pages: CrawlNode[] })[] = NAV_FOLDERS.map((f) => ({
  href: f.href,
  title: f.title,
  pages: f.items.map((i) => ({ href: i.href, title: i.title })),
}));

const HOME: CrawlNode = { href: "/", title: "Home" };

export const ALL_NODES: readonly CrawlNode[] = [HOME, ...SECTIONS.flatMap((s) => [{ href: s.href, title: s.title }, ...s.pages])];

const SIDEBAR_TARGETS = ALL_NODES.filter((n) => n.href !== "/");

export type CrawlOptions = { styles: Record<LinkGroup, LinkStyle>; orphan: string | null; sitemap: boolean };

export type Found = CrawlNode & { depth: number | "sitemap" };

export type CrawlResult = { found: Found[]; missing: CrawlNode[]; total: number; byLinks: number };

function linksFrom(href: string, styles: CrawlOptions["styles"]): CrawlNode[] {
  const out: CrawlNode[] = [];
  if (styles.sidebar === "link") out.push(...SIDEBAR_TARGETS);
  if (href === "/" && styles.home === "link") out.push(...SECTIONS);
  const section = SECTIONS.find((s) => s.href === href);
  if (section && styles.section === "link") out.push(...section.pages);
  return out;
}

export function crawl({ styles, orphan, sitemap }: CrawlOptions): CrawlResult {
  const depth = new Map<string, number>([["/", 0]]);
  const queue = ["/"];
  while (queue.length > 0) {
    const href = queue.shift()!;
    for (const next of linksFrom(href, styles)) {
      if (next.href === orphan || depth.has(next.href)) continue;
      depth.set(next.href, depth.get(href)! + 1);
      queue.push(next.href);
    }
  }
  const found: Found[] = [];
  const missing: CrawlNode[] = [];
  for (const node of ALL_NODES) {
    const d = depth.get(node.href);
    if (d !== undefined) found.push({ ...node, depth: d });
    else if (sitemap) found.push({ ...node, depth: "sitemap" });
    else missing.push(node);
  }
  return { found, missing, total: ALL_NODES.length, byLinks: depth.size };
}

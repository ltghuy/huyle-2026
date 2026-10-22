// Reads a page of this site the way a crawler's first fetch does: the HTML the
// server sends, parsed as text. DOMParser never runs the page's scripts.

import type { TopicSlug } from "@/practices/catalog";

export type Heading = { level: number; text: string };

export type Inspection = {
  status: number;
  /** Where the browser ended up when the server redirected, else null. */
  redirectedTo: string | null;
  xRobotsTag: string | null;
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogImage: string | null;
  jsonLd: number;
  h1: string[];
  headings: Heading[];
  internalLinks: number;
  externalLinks: number;
  words: number;
};

/** The SEO page that sets up each field this site doesn't send yet. */
export const ADDED_BY: Partial<Record<keyof Inspection, TopicSlug>> = {
  canonical: "crawling-indexing",
  ogTitle: "metadata-structured-data",
  ogImage: "metadata-structured-data",
  jsonLd: "metadata-structured-data",
};

const WORD = /\S+/g;

function text(el: Element | null) {
  return el?.textContent?.replace(/\s+/g, " ").trim() || null;
}

function meta(doc: Document, selector: string) {
  return doc.querySelector<HTMLMetaElement>(selector)?.content.trim() || null;
}

export type DocumentFields = Omit<Inspection, "status" | "redirectedTo" | "xRobotsTag">;

/** Reads the SEO fields from any document: parsed server HTML or a rendered page. */
export function readDocument(doc: Document): DocumentFields {
  const body = doc.body.cloneNode(true) as HTMLElement;
  body.querySelectorAll("script, style, noscript, template").forEach((el) => el.remove());

  let internalLinks = 0;
  let externalLinks = 0;
  doc.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    const href = a.getAttribute("href")!;
    if (href.startsWith("#") || href.startsWith("javascript:")) return;
    if (new URL(href, location.origin).origin === location.origin) internalLinks += 1;
    else externalLinks += 1;
  });

  return {
    title: text(doc.querySelector("title")),
    description: meta(doc, 'meta[name="description"]'),
    canonical: doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute("href") ?? null,
    robots: [...doc.querySelectorAll<HTMLMetaElement>('meta[name="robots"]')].map((m) => m.content.trim()).filter(Boolean).join(", ") || null,
    ogTitle: meta(doc, 'meta[property="og:title"]'),
    ogImage: meta(doc, 'meta[property="og:image"]'),
    jsonLd: doc.querySelectorAll('script[type="application/ld+json"]').length,
    h1: [...doc.querySelectorAll("h1")].map((h) => text(h) ?? ""),
    headings: [...doc.querySelectorAll("h2, h3")].map((h) => ({ level: Number(h.tagName[1]), text: text(h) ?? "" })),
    internalLinks,
    externalLinks,
    words: body.textContent?.match(WORD)?.length ?? 0,
  };
}

export async function inspectPage(path: string, signal: AbortSignal): Promise<Inspection> {
  const res = await fetch(path, { headers: { accept: "text/html" }, cache: "no-store", signal });
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  return {
    status: res.status,
    redirectedTo: res.redirected ? new URL(res.url).pathname : null,
    xRobotsTag: res.headers.get("x-robots-tag"),
    ...readDocument(doc),
  };
}

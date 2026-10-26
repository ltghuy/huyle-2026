import type { Metadata } from "next";

import { SITE_NAME } from "./site";

export const CARD_SIZE = { width: 1200, height: 630 } as const;

type PageMeta = {
  path: string;
  title: string;
  description: string;
  /** Path of the page's card image. */
  card: string;
  /** Handbook pages are articles, with their publish and change dates. */
  article?: { published: string; modified: string };
};

/**
 * Title, description, canonical URL and the full Open Graph and X card tags
 * for one page. Metadata merges shallowly: a page's `openGraph` replaces the
 * layout's whole object, so every field is set here instead of in a layout.
 */
export function pageMetadata({ path, title, description, card, article }: PageMeta): Metadata {
  const image = { url: card, ...CARD_SIZE, alt: `${title}, ${SITE_NAME}` };
  const shared = { siteName: SITE_NAME, locale: "en_US", url: path, title, description, images: [image] };
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: article
      ? { ...shared, type: "article", publishedTime: article.published, modifiedTime: article.modified }
      : { ...shared, type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/** A calendar date as an ISO 8601 date-time in the author's time zone. */
export function isoDate(date: string) {
  return `${date}T00:00:00+07:00`;
}

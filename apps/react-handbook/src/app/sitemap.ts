import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { practiceHref, practices, PRACTICES_PATH, sectionPages, sectionPath, sections, topicHref, topicPages, type TopicSectionId } from "@/practices/catalog";

// Only indexable pages: placeholders for pages being written are noindex and
// left out. lastmod is the page's last content change, so search engines can
// trust it.

const latest = (dates: string[]) => dates.reduce((a, b) => (a > b ? a : b));

export default function sitemap(): MetadataRoute.Sitemap {
  const built = practices.filter((p) => p.built);
  const written = topicPages.filter((p) => p.written);

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: latest([...built, ...written].map((p) => p.updated)) },
    { url: `${SITE_URL}${PRACTICES_PATH}`, lastModified: latest(built.map((p) => p.updated)) },
    ...built.map((p) => ({ url: `${SITE_URL}${practiceHref(p.slug)}`, lastModified: p.updated })),
  ];

  for (const section of sections) {
    if (section.id === "react-practices" || section.href === null) continue;
    const pages = sectionPages(section.id as TopicSectionId).filter((p) => p.written);
    if (pages.length === 0) continue;
    entries.push({ url: `${SITE_URL}${sectionPath(section.id as TopicSectionId)}`, lastModified: latest(pages.map((p) => p.updated)) });
  }
  entries.push(...written.map((p) => ({ url: `${SITE_URL}${topicHref(p.slug)}`, lastModified: p.updated })));
  return entries;
}

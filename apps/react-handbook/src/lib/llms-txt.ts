import { practiceHref, practices, PRACTICES_PATH, sectionPages, sectionPath, sections, topicHref, type TopicSectionId } from "@/practices/catalog";

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

// This site's llms.txt, in the format proposed at llmstxt.org: the site name
// as an H1, a one-line summary, then one section of links per handbook
// section. It lists the same pages as the sitemap.

const item = (title: string, path: string, notes: string) => `- [${title}](${SITE_URL}${path}): ${notes}`;

export function llmsTxt() {
  const blocks = [`# ${SITE_NAME}`, `> ${SITE_DESCRIPTION}`];

  for (const section of sections) {
    if (section.href === null) continue;
    const items =
      section.id === "react-practices"
        ? practices.filter((p) => p.built).map((p) => item(p.title, practiceHref(p.slug), p.summary))
        : sectionPages(section.id as TopicSectionId)
            .filter((p) => p.written)
            .map((p) => item(p.title, topicHref(p.slug), p.summary));
    if (items.length === 0) continue;
    const path = section.id === "react-practices" ? PRACTICES_PATH : sectionPath(section.id as TopicSectionId);
    blocks.push(`## ${section.title}\n\n${[item(`${section.title} overview`, path, section.summary), ...items].join("\n")}`);
  }

  return `${blocks.join("\n\n")}\n`;
}

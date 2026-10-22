import {
  practiceHref,
  practices,
  PRACTICES_PATH,
  sectionPages,
  sectionPath,
  sections,
  topicHref,
  type SectionId,
  type TopicSectionId,
} from "@/practices/catalog";

// The sections with content and their pages, shared by the sidebar and the
// page search. A plain module, so client components get the values.

export type NavItem = {
  href: string;
  title: string;
  summary: string;
  /** Shown before the title, e.g. a practice number. */
  prefix?: string;
  /** Built practice or written page; the rest are marked coming soon. */
  ready: boolean;
};

export type NavFolder = {
  id: SectionId;
  title: string;
  href: string;
  /** Accessible name of the folder's list, e.g. "Practices". */
  itemsLabel: string;
  items: NavItem[];
};

const sectionTitle = (id: SectionId) => sections.find((s) => s.id === id)!.title;

function topicFolder(id: TopicSectionId): NavFolder {
  return {
    id,
    title: sectionTitle(id),
    href: sectionPath(id),
    itemsLabel: "Pages",
    items: sectionPages(id).map((p) => ({ href: topicHref(p.slug), title: p.title, summary: p.summary, ready: p.written })),
  };
}

export const NAV_FOLDERS: NavFolder[] = [
  {
    id: "react-practices",
    title: sectionTitle("react-practices"),
    href: PRACTICES_PATH,
    itemsLabel: "Practices",
    items: practices.map((p) => ({
      href: practiceHref(p.slug),
      title: p.title,
      summary: p.summary,
      prefix: String(p.number).padStart(2, "0"),
      ready: p.built,
    })),
  },
  topicFolder("browser-platform"),
  topicFolder("performance-accessibility"),
  topicFolder("security"),
  topicFolder("system-design"),
  topicFolder("under-the-hood"),
  topicFolder("testing"),
];
